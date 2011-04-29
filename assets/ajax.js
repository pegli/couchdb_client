Ti.include("utils.js");

/**
 * AJAX functions for CouchDB client
 */
 
function httpData(xhr, type) {
  var contentType = xhr.getResponseHeader("content-type") || "";
  var isXml = type === "xml" || (!type && contentType.indexOf("xml") >= 0);
  var isJson = type === "json" || (!type && contentType.indexOf("json") >= 0);
  
  var data = isXml ? xhr.responseXML : xhr.responseText;
  if (typeof data === "string") {
    if (isJson) {
      data = JSON.parse(data);
    }
    // other types here?
  }
  return data;
}

function toQueryString(obj) {
  var buf = [];
  for (var name in obj) {
    var value = obj[name];
    if (inArray(name, ["key", "startkey", "endkey"]) >= 0) {
      value = JSON.stringify(value);
    }
    buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
  }
  return buf.length ? buf.join("&") : "";
}

/**
 *
 * opts.method HTTP method to use
 * opts.successStatus default 200; set to 201 for document create
 * opts.data for HTTP GET, the query parameters; otherwise request body
 * opts.headers extra headers to send
 * opts.success function(data) called on success; data is the object returned in the response
 * opts.failure function(xhr) called on failure with XMLHttpRequest object
 */
function ajax(req, opts, xhrOpts) {
  opts = opts || {};
  xhrOpts = xhrOpts || {};

  //var request = extend(req, opts);
  var request = extend({ successStatus: [200], method: "GET" }, req);
  
  // encode request.data onto URL
  if (request.data && request.method !== "POST" && request.method !== "PUT") {
    request.url += (request.url.indexOf("?") > -1 ? "&" : "?") + toQueryString(request.data);
    delete request.data;
  }
  
  successStatus = isArray(request.successStatus) ? request.successStatus : Array(request.successStatus);
  
  var xhr = Ti.Network.createHTTPClient(extend({
    onload: function(e) {
      var req = e.source;
      try {
        var resp = httpData(req, "json");
      }
      catch (err) {
        Ti.API.error(err.name + ": " + err.message);
        if (opts.failure) {
          opts.failure(req);
        }
        else {
          Ti.API.error(err);
        }
      }
      
      if (inArray(req.status, successStatus) >= 0) {
        if (opts.success) {
          opts.success(resp);
        }
      }
      else if (opts.failure) {
        opts.failure(req);
      }
      else {
        Ti.API.error("bad response: " + req.status + " " + req.responseText);
      }
    },
    onerror: function(e) {
      var req = e.source;
      if (opts.failure) {
        opts.failure(req);
      }
      else {
        Ti.API.error("AJAX error: " + JSON.stringify(e) + " " + req.status + " " + req.responseText);
      }
    }
  }, xhrOpts));

  xhr.open(request.method, request.url);
Ti.API.debug(request.method + " "+request.url);
  
  xhr.setMaxRedirects(0);
  
  // basic auth
  if (opts.username) {
    xhr.setRequestHeader('Authorization', 'Basic ' + Ti.Utils.base64encode(opts.username+':'+opts.password));
  }
  
  // generic Accept header, may be overwritten below
  xhr.setRequestHeader("Accept", "*/*");
  
  if (request.method === "POST" || request.method === "PUT") {
    xhr.setRequestHeader("Content-Type", "application/json");
  }
  
  // extra headers
  if (request.headers) {
    for (var header in request.headers) {
      xhr.setRequestHeader(header, request.headers[header]);
    }
  }
  
  xhr.send(isPlainObject(request.data) ? JSON.stringify(request.data) : request.data);
}
