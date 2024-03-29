
/***** 
RULES  OBJECT 
This object stores the individual rules for the game
******/

const Rules = [
	{
		"Name": "Answering Questions",
		"Options": [
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
				"suggestion": "Be sure to use the 'Host View' to see the answers while asking the question."
			}
		]
	},
	{
		"Name":"Selecting Questions",
		"Options": [
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
			},
			{
				"id": 3,
				"label": "Randomly Suggested by Game",
				"type": "select",
				"rule":"The questions are randomly suggested by the game.",
				"subRules":["The host still has to pick the suggested question."],
				"suggestion": "If using this setting for 'Selecting Questions', also use it for 'Who Goes First?'"
			}
		]
	},
	{
		"Name":"Who Goes First?",
		"Options": [
			{
				"id": 1,
				"label": "Random Team",
				"type": "select",
				"rule": "The first team is picked randomly.",
				"subRules": ["The team will be picked from the list of teams loaded when the game is Started", "All teams should enter game code and setup their team name before clicking \"Start Game\""],
				"suggestion": ""
			},
			{
				"id": 2,
				"label": "Host Selects Team",
				"type": "select",
				"rule": "The host will select the team who goes first.",
				"subRules": ["The team will be picked from the list of teams loaded when the game is Started", "All teams should enter game code and setup their team name before clicking \"Start Game\""],
				"suggestion": ""
			},
			{
				"id": 3,
				"label": "Randomly Suggested by Game",
				"type": "select",
				"rule":"The first question is randomly suggested by the game.",
				"subRules":["The host still has to pick the suggested question."],
				"suggestion": "If using this setting for 'Who Goes First?', also use it for 'Selecting Questions'"
			}
		]
	},
	{
		"Name": "Time to Answer Questions",
		"Options": [
			{
				"id": 1,
				"label": "15 Seconds to Answer.",
				"type": "number",
				"rule":"Each teams gets 15 seconds to answer the question!",
				"subRules":["Time starts after the question is read"],
				"suggestion": ""
			},
			{
				"id": 2,
				"label": "${VALUE} seconds to Answer.",
				"type": "custom number",
				"rule":"Each team gets ${VALUE} seconds to answer the question!",
				"subRules":["Time starts after the question is read"],
				"suggestion": ""
			},
	
		],
	},
	{
		"Name":"Final Jeopardy Wager",
		"Options": [
			{
				"id": 1,
				"label": "Classic",
				"type": "select",
				"rule": "For FINAL JEOPARDY, a team can only wager as many points as they have.",
				"subRules": [],
				"suggestion" : ""
			},
			{
				"id": 2,
				"label": "Max Wager is Highest Score",
				"type": "select",
				"rule":"For FINAL JEOPARDY, you can wager as much as the HIGHEST OVERALL SCORE!",
				"subRules":["The max amount that a team can wager is based on the highest overall score!",
							"So, you could come from behind &amp; beat the team in the lead &#128578;",
							"Or, you could lose it all and possibly end up with negative points. &#128579;"
							],
				"suggestion" : ""
			}
		]
	}
];