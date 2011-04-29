/** @module com.obscure.couchdb_client */

/**
 * @fileOverview
 * CouchDB client module for Appcelerator Titanium.  All of the functions
 * in this module are asynchronous and use an options object for common
 * parameters.
 * @see options
 */

Ti.include("sha1.js");
Ti.include("utils.js");
Ti.include("ajax.js");
Ti.include("base64.js");

/**
 * @name options
 * @field
 * @property {Function} success called by the module when the CouchDB call completes
 *    successfully.  The parameter to this function is the response from CouchDB
 *    as an object.
 * @property {Function} failure called by the module when the CouchDB call fails for
 *    any reason.  The parameter to this function is the XMLHttpRequest object used
 *    in the call.  You can extract the response code and error messages from that XHR.
 * @property {String} username the username to use during the call.  Some CouchDB calls
 *    require an admin user; depending on your security setup, other calls may also
 *    require a valid user.
 * @property {String} password the password to use during the call.
 */

(function(module) {

  /** @private */
  function userDb(callback) {
    module.session({
      success: function(resp) {
        var userDb = module.db(resp.info.authentication_db);
        callback(userDb);
      }
    });
  }
  
  /** @private */
  function prepareUserDoc(user_doc, new_password) {
    if (typeof hex_sha1 == "undefined") {
      Ti.API.error("creating a user doc requires sha1.js to be loaded in the page");
      return;
    }
    var user_prefix = "org.couchdb.user:";
    user_doc._id = user_doc._id || user_prefix + user_doc.name;
    if (new_password) {
      // handle the password crypto
      user_doc.salt = _newUUID();
      user_doc.password_sha = hex_sha1(new_password + user_doc.salt);
    }
    user_doc.type = "user";
    if (!user_doc.roles) {
      user_doc.roles = [];
    }
    return user_doc;
  }
  
  /** @private */
  function encodeDocId(docID) {
    var parts = docID.split("/");
    if (parts[0] == "_design") {
      parts.shift();
      return "_design/" + encodeURIComponent(parts.join('/'));
    }
    return encodeURIComponent(docID);
  }

  /** @private */
  var viewOptions = [
    "key", "startkey", "startkey_docid", "endkey", "endkey_docid", "limit",
    "stale", "descending", "skip", "group", "group_level", "reduce",
    "include_docs", "inclusive_end"
  ];

  /** @private */
  function encodeViewOptions(obj) {
    // http://wiki.apache.org/couchdb/HTTP_view_API
    // note that "keys" is handled separately
    var buf = [];
    for (var key in obj) {
      if (inArray(key, viewOptions) > -1) {
        buf.push(encodeURIComponent(key) + "=" + encodeURIComponent(JSON.stringify(obj[key])));
      }
    }
    return buf.join('&');
  }
  
  
  /**
   * base URL of the CouchDB server, i.e. 'http://localhost:5984'
   */
  module.urlPrefix = '';
  
  // public functions
  
  /**
   * Fetch a list of all databases.
   * @param options request options
   */
  module.allDbs = function(options) {
    ajax({
      url: this.urlPrefix + "/_all_dbs"
    }, options);
  };
  
  /**
   * Get information about the server or a database (add "dbname" field to the options object).
   * @param options request options
   */
  module.info = function(options) {
    ajax({
      url: this.urlPrefix + "/" + (options.dbname || "")
    }, options);  
  };

  module.config = function(options, section, key, value) {
    var req = { url: this.urlPrefix + "/_config/" };
    if (section) {
      req.url += encodeURIComponent(section) + "/";
      if (key) {
        req.url += encodeURIComponent(key);
      }
    }
    if (value === null) {
      req.method = "DELETE";        
    }
    else if (value !== undefined) {
      req.method = "PUT";
      req.data = JSON.stringify(value);
    }
    ajax(req, options);  
  };
  
  module.login = function(options, username, password) {
    this.session(extend({ username:username, password:password}, options));
  };
  
  module.logout = function(options) {
    ajax({
      method: "DELETE",
      url: this.urlPrefix + "/_session",
      username: "_",
      password: "_"
    }, options);
  };
  
  module.session = function(options) {
    ajax({
      url: this.urlPrefix + "/_session",
      headers: { "Accept": "application/json" }
    }, options);
  };
  
  module.signup = function(user_doc, password, options) {      
    options = options || {};
    user_doc = prepareUserDoc(user_doc, password);
    userDb(function(db) {
      db.saveDoc(user_doc, options);
    });
  };
  
  module.db = function(name, db_opts) {
    db_opts = db_opts || {};

    return {
      name: name,
      uri: this.urlPrefix + "/" + encodeURIComponent(name) + "/",

      /**
       * Request compaction of the specified database.
       * @param 
       */
      compact: function(options) {
        ajax({
          method: "POST",
          url: this.uri + "_compact",
          successStatus: 202
        }, options);
      },

      /**
       * Cleans up the cached view output on disk for a given view.
       */
      viewCleanup: function(options) {
        ajax({
          method: "POST",
          url: this.uri + "_view_cleanup",
          successStatus: 202
        }, options);
      },

      /**
       * Compacts the view indexes associated with the specified design
       * document. You can use this in place of the full database compaction
       * if you know a specific set of view indexes have been affected by a
       * recent database change.
       */
      compactView: function(groupname, options) {
        ajax({
          method: "POST",
          url: this.uri + "_compact/" + groupname,
          successStatus: 202
          }, options);
      },

      /**
       * Create a new database
       */
      create: function(options) {
        ajax({
          method: "PUT",
          url: this.uri,
          successStatus: 201
        }, options);
      },

      /**
       * Deletes the specified database, and all the documents and
       * attachments contained within it.
       */
      drop: function(options) {
        ajax({
          method: "DELETE",
          url: this.uri
        }, options);
      },

      /**
       * Gets information about the specified database.
       */
      info: function(options) {
        ajax({
          url: this.uri
        }, options);
      },

      /**
       * @namespace
       * $.couch.db.changes provides an API for subscribing to the changes
       * feed
       * <pre><code>var $changes = $.couch.db("mydatabase").changes();
       *$changes.onChange = function (data) {
       *    ... process data ...
       * }
       * $changes.stop();
       * </code></pre>
       */
      /* TODO TODO TODO 
      changes: function(since, options) {

        options = options || {};
        // set up the promise object within a closure for this handler
        var timeout = 100, db = this, active = true,
          listeners = [],
          promise = {
          onChange : function(fun) {
            listeners.push(fun);
          },
          stop : function() {
            active = false;
          }
        };
        // call each listener when there is a change
        function triggerListeners(resp) {
          $.each(listeners, function() {
            this(resp);
          });
        };
        // when there is a change, call any listeners, then check for
        // another change
        options.success = function(resp) {
          timeout = 100;
          if (active) {
            since = resp.last_seq;
            triggerListeners(resp);
            getChangesSince();
          };
        };
        options.error = function() {
          if (active) {
            setTimeout(getChangesSince, timeout);
            timeout = timeout * 2;
          }
        };
        // actually make the changes request
        function getChangesSince() {
          var opts = $.extend({heartbeat : 10 * 1000}, options, {
            feed : "longpoll",
            since : since
          });
          ajax(
            {url: db.uri + "_changes"+encodeOptions(opts)},
            options,
            "Error connecting to "+db.uri+"/_changes."
          );
        }
        // start the first request
        if (since) {
          getChangesSince();
        } else {
          db.info({
            success : function(info) {
              since = info.update_seq;
              getChangesSince();
            }
          });
        }
        return promise;
      },
      */

      /**
       * Fetch all the docs in this db.  You can specify an array of keys to
       * fetch by passing the <code>keys</code> field in the
       * <code>options</code> parameter.
       */
      allDocs: function(options) {
        var method = "GET";
        var data = null;
        if (options["keys"]) {
          method = "POST";
          var keys = options["keys"];
          delete options["keys"];
          data = { "keys": keys };
        }
        ajax({
            method: method,
            data: data,
            url: this.uri + "_all_docs"
        }, options);
      },

      /**
       * Fetch all the design docs in this db
       */
      allDesignDocs: function(options) {
        this.allDocs(extend({ startkey:"_design", endkey:"_design0" }, options));
      },

      /**
       * Returns the specified doc from the db.
       */
      openDoc: function(docId, options) {
        ajax({
          url: this.uri + encodeDocId(docId)
        }, options);
      },

      /**
       * Create a new document in the specified database, using the supplied
       * JSON document structure. If the JSON structure includes the _id
       * field, then the document will be created with the specified document
       * ID. If the _id field is not specified, a new unique ID will be
       * generated.
       */
      saveDoc: function(doc, options) {
        options = options || {};
        var db = this;
        if (doc._id === undefined) {
          var method = "POST";
          var uri = this.uri;
        }
        else {
          var method = "PUT";
          var uri = this.uri + encodeDocId(doc._id);
        }
        ajax({
          method: method,
          url: uri,
          data: doc,
          successStatus: [200, 201, 202]
        }, options);
      },

      /**
       * Save a list of documents
       */
      bulkSave: function(docs, options) {
        ajax({
          method: "POST",
          url: this.uri + "_bulk_docs",
          data: docs,
        }, options);
      },

      /**
       * Deletes the specified document from the database. You must supply
       * the current (latest) revision and <code>id</code> of the document
       * to delete eg <code>removeDoc({_id:"mydoc", _rev: "1-2345"})</code>
       */
      removeDoc: function(doc, options) {
        ajax({
          method: "DELETE",
          data: { rev: doc._rev },
          url: this.uri + encodeDocId(doc._id)
        }, options);
      },

      /**
       * Remove a set of documents
       */
      bulkRemove: function(docs, options){
        docs.docs = each(docs.docs, function(i, doc) {
          doc._deleted = true;
        });
        ajax({
          method: "POST",
          successStatus: 201,
          url: this.uri + "_bulk_docs",
          data: docs
        }, options);
      },

      /**
       * Copy an existing document to a new or existing document.
       */
      copyDoc: function(source, destination, options) {
        if (!destination) {
          // TODO get a UUID
        }
        ajax({
          method: "COPY",
          url: this.uri + encodeDocId(source),
          successStatus: 201,
          headers: { "Destination": destination }
        }, options);
      },

      /**
       * Creates and executes a temporary view.
       */
      query: function(mapFun, reduceFun, language, options) {
        language = language || "javascript";
        if (typeof(mapFun) !== "string") {
          mapFun = mapFun.toSource ? mapFun.toSource() : "(" + mapFun.toString() + ")";
        }
        var body = {language: language, map: mapFun};
        if (reduceFun != null) {
          if (typeof(reduceFun) !== "string")
            reduceFun = reduceFun.toSource ? reduceFun.toSource()
              : "(" + reduceFun.toString() + ")";
          body.reduce = reduceFun;
        }
        ajax({
            method: "POST",
            url: this.uri + "_temp_view",
            data: body,
            headers: { "Content-Type": "application/json" }
          },
          options);
      },


      /**
       * Fetch a _list view output.  You can specify a list of
       * <code>keys</code> in the options object to receive only those keys.
       */
      list: function(list, view, options) {
        var list = list.split('/');
        var method = 'GET';
        var data = null;
        if (options['keys']) {
          method = 'POST';
          var keys = options['keys'];
          delete options['keys'];
          data = {'keys': keys };
        }
        ajax({
          method: method,
          data: data,
          url: this.uri + '_design/' + list[0] + '/_list/' + list[1] + '/' + view
        }, options);
      },

      /**
       * Executes the specified view-name from the specified design-doc
       * design document.  You can specify a list of <code>keys</code>
       * in the options object to recieve only those keys.
       */
      view: function(name, options) {
        var name = name.split('/');
        var method = "GET";
        var data = null;
        if (options["keys"]) {
          method = "POST";
          var keys = options["keys"];
          delete options["keys"];
          data = { "keys": keys };
        }
        ajax({
            method: method,
            data: data,
            url: this.uri + "_design/" + name[0] + "/_view/" + name[1] + '?' + encodeViewOptions(options)
          }, options);
      },

      /**
       * Fetch an arbitrary CouchDB database property.  As of 1.1, only the
       * <code>_revs_limit</code> property is available.
       */
      getDbProperty: function(propName, options) {
        ajax({
          url: this.uri + propName
        }, options);
      },

      /**
       * Set an arbitrary CouchDB database property.  As of 1.1, only the
        * <code>_revs_limit</code> property is available.
       */
      setDbProperty: function(propName, propValue, options) {
        ajax({
          method: "PUT", 
          url: this.uri + propName,
          data : propValue
        }, options);
      }
    }  
  };
}(exports));
