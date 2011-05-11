// This is a test harness for your module
// You should do something interesting in this harness 
// to test out the module and to provide instructions 
// to users on how to use it by example.


// open a single window
var window = Ti.UI.createWindow({
	backgroundColor:'white'
});
var label = Ti.UI.createLabel();
window.add(label);
window.open();

// TODO: write your module tests here
var couchdb_client = require('com.obscure.couchdb_client');
Ti.API.info("module is => " + couchdb_client);

label.text = couchdb_client.example();

Ti.API.info("module exampleProp is => " + couchdb_client.exampleProp);
couchdb_client.exampleProp = "This is a test value";

if (Ti.Platform.name == "android") {
	var proxy = couchdb_client.createExample({message: "Creating an example Proxy"});
	proxy.printMessage("Hello world!");
}