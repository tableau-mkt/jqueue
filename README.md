jQueue
==============

**A generic in-browser queue for later processing.**


jQueue enables you to manage events/activites in the browser to be processed later.  Stash data along with the name of a process function.  This plugin is a companion to [Groucho](https://github.com/tableau-mkt/groucho), which is a client-side user activity tool.

**Dependencies**

1. [jQuery](http://jquery.com) - easy to use JS framework.
1. [jStorage](http://jstorage.info) - localStorage abstraction library [8k]
 * [JSON2](https://github.com/douglascrockford/JSON-js) - browser compatible JSON methods (if you care) [3k].
1. [Data Layer Helper](https://github.com/google/data-layer-helper) - access dataLayer properties [2k].
1. [Groucho](https://github.com/tableau-mkt/groucho) - Know your anonymous users [2k].

## More details

In order to improve user experiences you may want to hang onto data about activities and handle them later in the background.  The process function can attempt over and over until the requirements are met, thus is needs to use deferred promise objects to communicate with the queue.

Some example uses... Avoid a registration form with premium content yet later record the content access once you know who the user is.  Avoid displaying a stack of messages all at once if they are incidental.

## Code
A test function is available which will just output the data to the console on the next page load.
```javascript
$.jQueue.push({
    myKey: 123,
    foo: 'bar'
  },
  '$.jQueue.test'
);
```

For debugging or processing without a page load...
```javascript
$.jQueue.restart();
```

Stash some activity now, and wait until you can post it along with user details.
```javascript
// Add item to queue on video play.
$('.video .play').on('click', function videoActivity() {
  $.jQueue.push({
      activityType: 'video-play',
      contentTitle: 'Some cool video',
      campaignId: '01123581321345589144'
    },
    'myNamespace.crmPost',
    {processNow: true}
  );
});
// Callback to attempt data handling later.
myNamespace.crmPost = function crmPost(item) {
  var completed = $.Deferred();

  if ($('body.logged-in').length) {
    item.data.user = myNamespace.user;
    myCrm.postData(item.data);
    completed.resolve();
  }
  else {
    completed.reject();
  }

  return completed.promise();
}
```

### Thanks.
Have some suggestions? Feel free to send them or make a pull request.
