var express = require('express');
var app = express();


app.use(express.static(__dirname + '/public'));

app.listen(8081, "localhost");
console.log("Uber Server started on http://localhost:8081");