/**
 * @file $.jQueue -- Manage activites that should eventually be handled.
 *
 * EXAMPLE:
 * $.jQueue.push({myKey: 123, foo: 'bar'}, '$.jQueue.test');
 */

(function ($, window, g) {
  var nameSpace = 'jQueue',
      dlHelper = new DataLayerHelper(dataLayer),
      logger = {
        // Process the debug/error data.
        log: function log(message, options) {
          var severityStrings = {7: 'DEBUG', 5: 'NOTICE', 4: 'WARNING', 3: 'ERROR'},
              severity = options.severity || 5,
              type = options.type || 'watchLog';

          // Output to the browser.
          if (window.console) {
            console.log(type + ' | ' + severityStrings[severity] + ' | ' + message);
            if (options.data) console.log(options.data);
          }
        },

        /**
         * Developer helper only.
         */
        debug: function debug(message, options) {
          logger.log(message, $.extend(options || {}, {severity: 7}));
        },

        /**
         * Nice to know about, will be recorded, default.
         */
        notice: function notice(message, options) {
          logger.log(message, $.extend(options || {}, {severity: 5}));
        },

        /**
         * Need to know when this occurs.
         */
        warning: function warning(message, options) {
          logger.log(message, $.extend(options || {}, {severity: 4}));
        },

        /**
         * Should never happen, problem.
         */
        error: function error(message, options) {
          logger.log(message, $.extend(options || {}, {severity: 3}));
        }
      };

  /**
   * Process queue item.
   *
   * @param  {object} item
   *   Queue item.
   *
   * @return {string|boolean}
   *   Error message or keep false for no problems.
   */
  function processItem(item) {
    var callback = item.hasOwnProperty('callback') ?
        stringProperty(window, item.callback) :
        $.jQueue.test;

    // Prepare item.
    item.meta.status = 'processing';
    $.jStorage.set(item._key, item);

    // Pass data through callback.
    logger.debug('Item callback attempt', {type: nameSpace});
    if (typeof callback === 'function') {
      $.when(callback(item)).done(function queueItemCallback() {
        // Not in all browsers.
        var callbackName = callback.hasOwnProperty('name') ? callback.name : 'not available';
        // Remove from queue and move along.
        $.jStorage.deleteKey(item._key);
        logger.notice('Callback complete', {type: nameSpace, data: {callback: callbackName}});
        return false;
      }).fail(function() {
        // Allow "failing" callbacks if data conditions aren't yet met.
        item.meta.status = 'ready';
        $.jStorage.set(item._key, item);
        logger.debug('Item callback rejected', {type: nameSpace});
        return false;
      });
    }
    else {
      return 'callback not a function: ' + item.callback;
    }
  }

  /**
   * Move to the next queue item and run it's allback.
   *
   * @param {object} queue
   *   Currently active queue as is walks through.
   */
  function nextItem(queue) {
    var item = queue.shift(),
        error;

    // End of the queue.
    if (item === undefined) {
      $(document).trigger('jQueue:empty');
      return;
    }

    // Check item for validity.
    if (typeof item === 'object' && item.meta && item.meta.status) {
      if (item.meta.status === 'processing') {
        nextItem(queue);
      }
      else if (item.meta.status === 'new' || item.meta.status === 'ready') {
        error = processItem(item);
      }
      else {
        error = 'unknown item status';
      }
    }
    else {
      $.jStorage.setTTL(item._key, 10000);
      error = 'bad item type or missing required properties';
    }

    // Report and continue.
    if (error) {
      logger.error('Item error: ' + error, {type: nameSpace, data: {error: error}});
    }
    nextItem(queue);
  }


  /**
   * Access an object property by string.
   *
   * @param  {object} obj
   * @param  {string} lineage
   * @return {mixed}
   *   Property referred to in string.
   */
  function stringProperty(obj, lineage) {
    var arr = lineage.split('.'), p;
    while (arr.length) {
      p = arr.shift();
      if (obj.hasOwnProperty(p)) obj = obj[p];
      else return false;
    }
    return obj;
  }


  /**
   * Public interface.
   */
  $.jQueue = {

    /**
     * Generic post queue addition.
     *
     * @param {object} vars
     *   Data to be stored with the queue item.
     * @param {string} callbackName
     *   Globally accessable function to process the queue item.
     * @param {object} options
     *   Config options for reacting to pushing item into the queue.
     */
    push: function queuePush(data, callbackName, options) {
      var queueAddCheck,
          maxChecks = 6,
          initLength,
          attempts;

      options = options || {};

      // Attempt to process now.
      if (options.processNow) {
        initLength = g.getActivities(nameSpace).length;
        attempts = 0;

        // Wait until added. Punting on promise/deferred in Groucho.
        logger.debug(
          'Monitoring for pushes to attempt immediate processing. Length: ' + initLength,
          {type: nameSpace}
        );
        queueAddCheck = window.setInterval(function queueCheck() {
          var queue = g.getActivities(nameSpace);
          logger.debug('Checking for item addition. Length: ' + queue.length, {type: nameSpace});
          if (attempts === maxChecks) {
            clearInterval(queueAddCheck);
          }
          if (queue.length > initLength) {
            // New item was added.
            clearInterval(queueAddCheck);
            nextItem(queue);
          }
          attempts++;
        }, 500);
      }

      // Add item to a persistent queue with meta data.
      g.createActivity(nameSpace, {
        callback: callbackName,
        data: data,
        meta: {
          status: 'new',
          url: window.location.href,
          entityBundle: dlHelper.get('entityBundle'),
          entityNid: dlHelper.get('entityNid'),
          entityTnid: dlHelper.get('entityTnid')
      }});

      logger.notice('Item added', {
        type: nameSpace,
        data: $.extend(data, {callback: callbackName})
      });
    },

    /**
     * Example/test queue-item callback. Waits and outputs your data :)
     *
     * @param {object} data
     *   Data about the item to help process.
     *
     * @return {Promise}
     */
    test: function queueTest(item) {
      var completed = $.Deferred();
      // Output what you have.
      logger.warning('Test function used', {
        type: nameSpace,
        data: $.extend(item.data, {_meta: item.meta})
      });
      window.setTimeout(completed.resolve, 5000);
      return completed.promise();
    },

    /**
     * Kick off a round of queue process attempts.
     */
    restart: function queueRestart() {
      nextItem(g.getActivities(nameSpace));
    }
  };


  /**
   * Check the queue once.
   */
  $(window).load(function() {
    nextItem(g.getActivities(nameSpace));
  });

})(window.jQuery || window.Zepto || window.$, window, groucho);
