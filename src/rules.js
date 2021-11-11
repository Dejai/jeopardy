
/***** 
RULES  OBJECT 
This object stores the individual rules for the game
******/

const Rules = 
{
	"Answering Questions": [
		{
			"id": 1,
			"label": "Everyone Gets a Chance",
			"type": "select",
			"rule":"Everyone gets a chance to answer every question!",
			"subRules":["For each question, every team gets a chance to answer.",
						"Including the \"Daily Double\" questions"
						],
			"suggestion": ""
		},
		{
			"id": 2,
			"label": "First to Buzz!",
			"type": "select",
			"rule":"The first person to buzz in after the question is asked, gets to answer the question first.",
			"subRules":["If the person who buzzes doesn't get it correct, the next person to buzz in gets to answer",
						"NOTE: The game doesn't have any buzz-in feature, so you'll have to use your own buzzers"
						],
			"suggestion": "Be sure to use the 'LIVE' host view to see the question & answer to determine who got it right"
		}
	],

	"Selecting Questions":[
		{
			"id": 1,
			"label": "Everyone Gets a Chance",
			"type": "select",
			"rule": "Everyone gets a chance to pick a question from the board.",
			"subRules": ["The game will automatically cycle through the list of teams"],
			"suggestion": ""
		},
		{
			"id": 2,
			"label": "Last Person to Get it Right",
			"type": "select",
			"rule":"The first person to buzz-in AND get the question correct gets to pick the next question",
			"subRules":["The host can choose whatever means to determine who gets to pick first."],
			"suggestion": ""
		}
	],

	"Time to Answer Questions": [
		{
			"id": 1,
			"label": "15 Seconds to Answer.",
			"type": "number",
			"rule":"You've got 15 seconds to answer the question!",
			"subRules":["That's how long you get to deliberate for each question.",
						"Time starts after the question is read"
						],
			"suggestion": ""
		},
		{
			"id": 2,
			"label": "${VALUE} seconds to Answer.",
			"type": "custom number",
			"rule":"You've got ${VALUE} seconds to answer the question!",
			"subRules":["That's how long you get to deliberate for each question.",
						"Time starts after the question is read"
						],
			"suggestion": ""
		},

	],
	
	"Final Jeopardy Wager": [
		{
			"id": 1,
			"label": "Classic",
			"type": "select",
			"rule": "You can only wager as many points as you have at the beginning of Final Jeopardy!",
			"subRules": [],
			"suggestion" : ""
		},
		{
			"id": 2,
			"label": "Max Wager is Highest Score",
			"type": "select",
			"rule":"For FINAL JEOPARDY, you can wager as much as the HIGHEST OVERALL SCORE!",
			"subRules":["The max amount that you can wager is based on the highest overall score!",
						"So, you could come from behind &amp; beat the team in the lead &#128578;",
						"Or, you could lose it all and end up with negative points. &#128579;"
						],
			"suggestion" : ""
		}
	]
}
