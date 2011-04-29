// This is a test harness for your module
// You should do something interesting in this harness 
// to test out the module and to provide instructions 
// to users on how to use it by example.


// open a single window
var window = Ti.UI.createWindow({
	backgroundColor:'white'
});
var label = Ti.UI.createLabel({
  text: "running tests"
});
window.add(label);
window.open();

// TODO: write your module tests here
var couchdb = require('com.obscure.couchdb_client');
couchdb.urlPrefix = "http://localhost:5984";

couchdb.allDbs({
  success: function(data) {
    label.text = JSON.stringify(data);
  }
});
