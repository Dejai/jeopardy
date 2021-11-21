
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
			"suggestion": "Be sure to use the 'LIVE' host view to see the answer while asking the question. To know who got it right;"
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
			"subRules":["If nobody gets the current question correct, the last person to got a question correct continues picking."],
			"suggestion": "If using this setting, the 'Answering Questions' setting should be 'First to Buzz!'"
		}
	],

	"Who Goes First?":[
		{
			"id": 1,
			"label": "Random Player",
			"type": "select",
			"rule": "The first player is picked randomly.",
			"subRules": ["The player will be picked from the players loaded when the game is Started", "All players should enter game code and setup their team name before clicking \"Start Game\""],
			"suggestion": ""
		},
		{
			"id": 2,
			"label": "Host Selects Player",
			"type": "select",
			"rule": "The host will select the player who goes first.",
			"subRules": ["The player will be picked from the players loaded when the game is Started", "All players should enter game code and setup their team name before clicking \"Start Game\""],
			"suggestion": ""
		}
	],

	"Time to Answer Questions": [
		{
			"id": 1,
			"label": "15 Seconds to Answer.",
			"type": "number",
			"rule":"Each play gets15 seconds to answer the question!",
			"subRules":["Time starts after the question is read"],
			"suggestion": ""
		},
		{
			"id": 2,
			"label": "${VALUE} seconds to Answer.",
			"type": "custom number",
			"rule":"Each play gets ${VALUE} seconds to answer the question!",
			"subRules":["Time starts after the question is read"],
			"suggestion": ""
		},

	],
	
	"Final Jeopardy Wager": [
		{
			"id": 1,
			"label": "Classic",
			"type": "select",
			"rule": "A player can only wager as many points as they have, when the final round begins",
			"subRules": [],
			"suggestion" : ""
		},
		{
			"id": 2,
			"label": "Max Wager is Highest Score",
			"type": "select",
			"rule":"For FINAL JEOPARDY, you can wager as much as the HIGHEST OVERALL SCORE!",
			"subRules":["The max amount that a player can wager is based on the highest overall score!",
						"So, you could come from behind &amp; beat the team in the lead &#128578;",
						"Or, you could lose it all and possibly end up with negative points. &#128579;"
						],
			"suggestion" : ""
		}
	]
}