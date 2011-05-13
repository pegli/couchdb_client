CouchDb Client Library for Appcelerator Titanium Mobile
-------------------------------------------------------

This project is a port of `jquery.couchdb.js` to use the `Titanium.Network.HTTPClient`
API instead of jQuery.  There are three versions of the library:

### `modules/ios`

Native module for iOS devices.  See the Github wiki for build and installation
instructions.

### `modules/android`

A work in progress.  There are some issues with a native Javascript module on Android,
so for that platform, I suggest that you use...

### `modules/noarch/com.obscure.couchdb_client.inc.js`

The library as an includeable script.  To use this version of the script, copy it to
your `Resources` directory and include it in your app files as follows:

    Titanium.include('com.obscure.couchdb_client.inc.js');

This will create a variable named `couchdb_client` in the current context which can
be used to communicate with the CouchDb server.



Acknowledgements
----------------

This library is based on the work of the Apache CouchDb team and contributors.

sha1.js
Version 2.1a Copyright Paul Johnston 2000 - 2002.

base64.js
Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>