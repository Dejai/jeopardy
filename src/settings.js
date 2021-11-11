
/***** 
SETTINGS  OBJECT 
This object stores the setting and rule configuration for the game
******/

const Settings = {

	currentSettings : [
		{ "name": "Answering Questions", "option": 1 },
		{ "name": "Selecting Questions", "option": 1 },
		{ "name": "Time to Answer Questions", "option": 2, "value": 20 },
		{ "name": "Final Jeopardy Wager", "option": 1 }
	],

	// Gets the settings (w/ rules) for the game
	GetSettings: function(jsonObj=undefined){
		
		console.log("Is JSONOBJ passed in?");
		console.log(jsonObj);

		this.currentSettings  = (jsonObj != undefined) ? jsonObj : this.currentSettings;
		
		//update the settings to include the rules
		this.SetRules(); 
		
		return this.currentSettings;
	},

	// Get the individual rule from the Rules object;
	GetRule: function(ruleName, ruleOptionID, ruleValue=undefined){

		let optionIndex = Number(ruleOptionID-1);
		console.log(optionIndex);
		let ruleObj = {};
		if(Rules.hasOwnProperty(ruleName))
		{
			ruleObj = Rules[ruleName][optionIndex];

			// Merge value i fpresent;
			if(ruleObj != undefined && ruleValue != undefined)
			{
				ruleObj = this._mergeRuleValue(ruleObj, ruleValue);
			}
		}
		return ruleObj;
	},

	// Takes the current settings and adds the rules to each setting
	SetRules: function(){

		// Updates the current settings to include Rule
		this.currentSettings.forEach(function(obj){
			let ruleName = obj["name"];
			let ruleOption = Number(obj["option"]) ?? 1;
			let ruleValue = obj["value"] ?? undefined;

			rule = Settings.GetRule(ruleName, ruleOption, ruleValue);

			if(rule!= undefined)
			{
				obj["rule"] = rule;
			}
		});
	},

	// Merge custom values into the Rule description
	_mergeRuleValue: function(ruleObject, value) {
		
		let updatedObject = ruleObject;
		if(value != undefined)
		{
			updatedObject["label"] = updatedObject["label"].replace("${VALUE}",value);
			updatedObject["rule"] = updatedObject["rule"].replace("${VALUE}",value);
		}
		return updatedObject;
	}
};

// let setting = Settings.GetSettings();
// console.log("My settings w/ rules");
// console.log(setting);