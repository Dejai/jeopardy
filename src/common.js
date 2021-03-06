/**********************************************************************************************************
	Author: Derrick Fyfield
	Purpose:
		This "common" script will house things that I would want to reuse throughout this local server

**********************************************************************************************************/

// customObject = Pass in a custom object with variables/values that you would want to use with the data returned from the ajax call 

/*
	This object is used to make local server AJAX calls easier; 
*/

// EXTENSION METHODS 
	// if (typeof Array.prototype.contains !== "function"){ Array.prototype.contains = function(value){ return this.includes(value); } }
	// if (typeof Object.prototype.contains !== "function"){ Object.prototype.contains = function(value) { return this[value] != undefined; } }


const Logger = { 

	logged_data: [],

	log: function(content, printLog=false){ 
		this.logged_data.push(content);
		if(printLog){ this.print_logged_data(content)}
	},

	show_log: function(){
		logged_data.forEach(function(obj){
			console.log(obj);
		});
	},

	print_logged_data: function(content){
		console.log(content);
	},

	errorHandler: function(err){
					console.log("ERROR");
					console.log(err);
				}
}

const Helper = {
	_getRandomCharacter: function(){
		characters = "abcdefghijklmnopqrstuvwxyz";
		randChar = Math.floor(Math.random()*characters.length);
		return characters[randChar].toUpperCase();
	},

	_isReservedCode: function(code){
		var reserved = ["DEMO", "TEST"];
		return reserved.includes(code.toUpperCase());
	},

	getCode: function(numChars=4){
		let chars = "";

		for(var idx = 0; idx < numChars; idx++)
		{
			chars += Helper._getRandomCharacter();
		}

		var code = ( Helper._isReservedCode(chars) ) ? Helper.getCode() : chars;
		return code;
	},

	getDate: function(){
		let dd = new Date();
		let year = dd.getFullYear().toString();
		let monthIdx = dd.getMonth()+1;
		let month = (monthIdx<9) ? "0"+monthIdx : monthIdx;
		let dayIdx = dd.getDate();
		let day = (dayIdx < 9 ) ? "0"+dayIdx : dayIdx;
		var myDateObj = { "year":year, "month":month, "day":day };
		return myDateObj;
	},

	getDateFormatted: function(format=undefined){
		let date = Helper.getDate();
		let year = date["year"];
		let month = date["month"];
		let day = date["day"];

		let dateFormatted = `${year}-${month}-${day}`;
		switch(format)
		{
			case "yyyy/mm/dd":
				dateFormatted = `${year}/${month}/${day}`;
				break;
			default:
				dateFormatted = `${year}-${month}-${day}`;
				break;
		}
		return dateFormatted
	}
}


const mydoc = {

	ready: function(callback){
		document.addEventListener("DOMContentLoaded", callback);
	},

	loadContent: function(content, identifier)
	{
		element = document.getElementById(identifier);
		element.innerHTML = content;
	},

	// Show content based on query selector
	showContent: function(selector){
		this._toggleClass(selector, "remove", "hidden");
	},

	// Hide based on query selector
	hideContent: function(selector){
		this._toggleClass(selector, "add", "hidden");
	},

	addClass: function(selector, className){
		this._toggleClass(selector, "add", className);
	},

	removeClass: function(selector, className){
		console.log(selector + " " + className);
		this._toggleClass(selector, "remove", className);
	},

	isValidValue : function(value)
	{
		let isValid = false;
		switch(typeof(value))
		{
			case "number":
				isValid = ( !isNaN(Number(value)) );
				break;
			case "string":
				isValid = (value != undefined && value != "");
				break;
			case "function":
				isValid = (typeof(value) == "function")
				break;
			default:
				isValid = false;
		}
		return isValid;
	},

	get_query_param: function(key){
		let map = this.get_query_map();
		let value = undefined;
		if(map.hasOwnProperty(key))
		{
			value = map[key]
		}
		return value;
	},

	get_query_map: function(){
		let query_string = location.search;
		let query = query_string.replace("?", "")
		var query_map = {}
		var combos = query.split("&");
		combos.forEach(function(obj)
		{
			let splits = obj.split("=");
			query_map[splits[0]] = splits[1];
		});
		return query_map;
	},
	
	_toggleClass: function(selector, action, className){
		try
		{
			let elements = Array.from(document.querySelectorAll(selector));
			if(elements != undefined)
			{
				elements.forEach(function(obj){
					if(action == "add")
					{
						obj.classList.add(className);
					}
					else if(action == "remove")
					{
						obj.classList.remove(className);
					}
				});
			}
		} 
		catch(error)
		{
			Logger.log(error, true);
		}
	}
};

const myajax = { 
	
	GetContentType: function(type){
		var content_type = "";
		switch(type){
			case "JSON":
			case "json":
				content_type = "application/json";
				break;
			case "Multipart Form Data":
			case "Multipart":
				content_type = "multipart/form-data";
				break;
			case "Text":
			case "Plain Text":
				content_type = "text/plain";
			default:
				break;
		}
		return content_type;
	},

	GetProperties: function(){
		let properties = [
			["method", "string", "The method of the call (GET, POST, PUT, DELTE)"],
			["path", "string", "The path of the API call"],
			["success", "function", "Custom function to call on successful call"],
			["failure", "function", "Custom function to call on FAILED call"],
			["data", "varied", "Custom data to send in PUT or POST"],
			["contentType", "string", "A string to indicate what Content-type header should be set"],
			["cacheControl", "string", "A string to determine the Cache-Control header"]
		];
		properties.forEach(function(obj){
			name = obj[0];
			type = obj[1];
			desc = obj[2];
			let message = `Property:\t${name}\nType:\t${type}\nDescription\t${desc}\n\n`;
		});
	},

	GetJSON: function(jsonString){
		try
		{
			let jsonObject = JSON.parse(jsonString);
			return jsonObject
		}
		catch(error)
		{
			Logger.log(error, true);
			return undefined;
		}
	},

	isValidAjaxObject: function(object){
		let state = {isValid: true, message:"All set"};

		if ( !object.hasOwnProperty("method") )
		{
			state.isValid = false;
			state.message = "Missing TYPE of call (GET vs. POST)";
			return state;
		}

		if (object["method"] == "POST" && !object.hasOwnProperty("data"))
		{
			state.isValid = false;
			state.message = "Doing a POST - but with no data";
		}

		return state;
	},

	isValidFunction(obj, key){
		return (obj.hasOwnProperty(key) && typeof(obj[key]) == "function");
	},

	AJAX: function(object){
		let checkObject = myajax.isValidAjaxObject(object);
		if (!checkObject.isValid){
			throw new Error(checkObject.message);
		}

		// Getting/Setting the parts of the call
		let method 	= object["method"];
		let path 	= object["path"];

		let success = this.isValidFunction(object, "success") ? object["success"] : function(request){console.log(request);};
		let failure = this.isValidFunction(object, "failure") ? object["failure"] : function(request){console.log(request);};

		// Setting up the request object
		var xhttp = new XMLHttpRequest();
		xhttp.open(method, path, true);

		// What to do after the call is made
		xhttp.onreadystatechange = function() {
			request = this;
			if (request.readyState == 4 && request.status == 200)
			{
				success(request);
			}
			else if (request.readyState == 4 && request.status != 200)
			{
				failure(request);
			}
		};

		if(object.hasOwnProperty("cacheControl"))
		{
			xhttp.setRequestHeader('Cache-Control', object["cacheControl"]);
		}

		// Send/proces the request
		if ( object.hasOwnProperty("data") )
		{
			let data = object["data"];

			// Check if content type is set
			if(object.hasOwnProperty("contentType"))
			{
				let content_type = this.GetContentType( object["contentType"] );
				if(content_type != "")
				{
					xhttp.setRequestHeader('Content-type', content_type);
				}
			}
			xhttp.send(data);
		}
		else
		{
			xhttp.send();
		}
	}
}

const Speaker = {

	voicesMap: {"One":"Two"},
	selectedVoice: undefined,

	getListOfVoices: function(){
		let synth = window.speechSynthesis;
		var voices = synth.getVoices();

 		for(i = 0; i < voices.length ; i++) {
			var current_voice = voices[i];
			if (current_voice.lang.includes("en") && !current_voice.name.includes("Google"))
			{
				if(Speaker.selectedVoice == undefined)
				{
					Speaker.selectedVoice = current_voice;
				}
			  	Speaker.voicesMap[current_voice.name] = voices[i];
			  	// console.log(current_voice);
			}
		}
	},

	loadVoiceOptions: function(){
		// this.getListOfVoices();
		if (speechSynthesis.onvoiceschanged !== undefined) {
		  speechSynthesis.onvoiceschanged = Speaker.getListOfVoices;
		}
	},

	generateSelectListOfVoices: function(selector){
		var voiceSelect = document.querySelector(selector);
	},

	getSelectedVoice: function(){
		return Speaker.selectedVoice;
	},

	setSelectedVoice: function(name){
		console.log(Speaker.voicesMap);
		
		let voice = Speaker.voicesMap[name];
		if(voice != undefined)
		{
			Speaker.selectedVoice = voice;
		}
	},

	//  Generic value for speaking text value
	speakText: function(text, subtext=undefined, rate=0.9, subrate=0.6, pause=2000){
		let synth = window.speechSynthesis;
		
		// https://dev.to/asaoluelijah/text-to-speech-in-3-lines-of-javascript-b8h
		var msg = new SpeechSynthesisUtterance();
		msg.rate = rate;
		msg.text = text;
		selectedVoice = this.getSelectedVoice()
		if(selectedVoice != undefined)
		{
			msg.voice = selectedVoice;
		}
		synth.speak(msg);

		if (subtext != undefined)
		{
			stillSpeaking = setInterval(function(){
				if(!synth.speaking)
				{
					console.log("Done Speaking");
					clearInterval(stillSpeaking);
					//  Do the sub description 
					setTimeout(function(){
						msg.text = subtext;
						msg.rate = subrate;
						synth.speak(msg);
					}, pause);
				}
			}, 500);
		}
	},
}