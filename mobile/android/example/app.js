// This is a test harness for your module
// You should do something interesting in this harness 
// to test out the module and to provide instructions 
// to users on how to use it by example.

Ti.include("com.obscure.couchdb_client.js");

// open a single window
var window = Ti.UI.createWindow({
	backgroundColor:'white'
});
var label = Ti.UI.createLabel({
  text: "running tests"
});
window.add(label);
window.open();

couchdb_client.urlPrefix = "http://10.8.17.113:5984";

couchdb_client.allDbs({
  success: function(data) {
    label.text = JSON.stringify(data);
  }
});
