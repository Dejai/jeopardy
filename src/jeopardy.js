/************Jeopardy Generic Variables**********************/
	var JEOPARDY_GAME = undefined;
	var JEOPARDY_QA_MAP = {};

/*************Jeopardy Classes/Models**********************/
	
	class Jeopardy
	{
		constructor(rows)
		{
			this.categories = {}
			this.initialize(rows);
		}

		// Initialize the Jeopardy object;
		initialize(rows)
		{
			rows.forEach( (row) => {

				// General content
				let category_name = row["Category Name"];
				if(category_name != "")
				{
					// question value
					let value = row["Score Value"];
					let daily_double = row["Daily Double?"];

					// question content
					let question_text = row["Question (Text)"];
					let question_audio = row["Question (Audio)"];
					let question_image = row["Question (Image)"];
					let question_url = row["Question (URL)"];

					// Answer content
					let answer_text = row["Answer (Text)"];
					let answer_audio = row["Answer (Audio)"];
					let answer_image = row["Answer (Image)"];
					let answer_url = row["Answer (URL)"];
	
					// Setup the new question
					let new_question = new Question(question_text, question_audio, question_image, question_url,
						answer_text, answer_audio, answer_image, answer_url, value, daily_double);
	

					// Add the question to the game; 
					this.addQuestion(category_name, new_question);
					// this.getCategory(category_name).addQuestion(new_question);
				}
			});
		}

		// Add the question specifically to a category
		addQuestion(categoryName, question)
		{
			let category = this.getCategory(categoryName);
			category.addQuestion( question );
		}

		// Get the set of category objects;
		getCategories() { return Object.values(this.categories); }

		// Get a specific category from this game;
		getCategory(name)
		{

			let keys = Object.keys(this.categories);

			// If category not created yet; make sure it is
			if(!keys.includes(name))
			{
				this.categories[name] = new Category(name);
			}

			// Return the category;
			return this.categories[name];
		}
	};

	/* The Category object */
	class Category
	{
		constructor(name)
		{
			this.name = name;
			this.questions = [];
			this.finalJeopardy = false;

			// Check for final jeopardy;
			this.checkFinalJeopardy();
		}

		// Check if this category is a final jeopardy category
		checkFinalJeopardy()
		{
			let formatted = this.name.toUpperCase().replaceAll (" ", "").replaceAll("!","");
			this.finalJeopardy = (formatted == "FINALJEOPARDY");
		}

		// Return if this category is the final jeopardy
		isFinalJeopardy() { return this.finalJeopardy; }

		// Add a question to this category
		addQuestion(question)
		{
			this.questions.push(question);
		}

		// Get the category name;
		getName(){ return this.name; }

		// Get the questions of this category;
		getQuestions(){ return this.questions; }

		// Get the question count of this category;
		getQuestionCount(){ return this.questions.length; }
	}

	/* The Question object */
	class Question
	{
		constructor(question, questAudio, questImg, questURL, 
					answer, answerAudio, answerImg, answerURL,
					value, dailyDouble)
		{
			this.question 		= this.format_content(question);
			this.questionAudio 	= questAudio;
			this.questionImage 	= questImg;
			this.questionURL	= questURL

			this.answer   		= this.format_content(answer);
			this.answerAudio 	= answerAudio;
			this.answerImage 	= answerImg;
			this.answerURL 	= answerURL;

			this.value    		= value;

			this.dailyDouble    = (dailyDouble == "Yes" || dailyDouble == true) ?  true : false;
		}

		// Format content
		format_content(value)
		{
			let formatted = value.replaceAll(/((^|\s))\"/g, "$1&#8220;").replaceAll(/\"/g, "&#8221;")
			return formatted
			// formatted = formatted.
		}

		// Setters
		setQuestionAudio(path) { this.questionAudio = path; }
		setQuestionImage(path) { this.questionAudio = path; }
		setQuestionURL(path) { this.questionAudio = path; }
		setAnswerAudio(path) { this.answerAudio = path; }
		setAnswerImage(path) { this.answerAudio = path; }
		setAnswerURL(path) { this.answerAudio = path; }

		// Getters
		getValue(){ return this.value; }

		getQuestion(){
			let question_obj = {
				"value": this.value,
				"text": this.question,
				"audio": this.questionAudio,
				"image": this.questionImage,
				"url": this.questionURL,
				"dailydouble": this.dailyDouble
			} 
			return question_obj;
		}

		getAnswer(){
			let answer_obj = {
				"text": this.answer,
				"audio": this.answerAudio,
				"image": this.answerImage,
				"url": this.answerURL
			} 
			return answer_obj;
		}
	}


/*********** Jeopardy Helper Functions *********************/

	// Used to create a Jeopardy game object;
	function createJeopardyObject(rows)
	{
		Logger.log("Creating Jeopardy Objects");
		JEOPARDY_GAME = new Jeopardy(rows);
		console.log(JEOPARDY_GAME);		
	}

	// Create the Game Board TABLE
	function getJeopardyGameBoard()
	{
		Logger.log("Creating the Game Board.");

		// Two "boards" - regular round and final jeopardy
		var main_board = "<tr id=\"round_1_row\" class=\"hidden\">";
		var final_board = "<tr id=\"final_jeopardy_row\" class=\"hidden\">";

		// Get categories;
		let categories = JEOPARDY_GAME.getCategories();
		let categoriesLength = categories.length-1;
		let categoryCount = 0;

		categories.forEach(function(category){

			categoryCount++;

			isFinalJeopardy = category.isFinalJeopardy();

			// Properties for the table rows
			colspan 		= (isFinalJeopardy) ? 3 : 1;
			dynamic_width 	= (isFinalJeopardy) ? 100 : (1 / categoriesLength);

			category_name 	= category.getName();
			let preFilledCategoryName = (isFinalJeopardy) ? category_name : "";

			// Values for the "how to play" tooltip
			let howToPlayClass = categoryCount == 3 ? "howtoplay_tooltip" : "";
			let howToPlaySpan = categoryCount == 3 ? "<span class='tooltiptext tooltiphidden tooltipvisible tooltipabove'>Click to reveal the category names.</span>" : "";

			// Set the header for the category
			category_name_row 		= `<tr><th class='category category_title ${howToPlayClass}' data-jpd-category-name='${category_name}'>${howToPlaySpan}${preFilledCategoryName}</th></tr>`;
			
			// Set the questions 
			category_questions_row	= "";
			questions = category.getQuestions();
			questions.forEach(function(question){
				

				quest = question.getQuestion();
				ans   = question.getAnswer();
				key = (isFinalJeopardy) ? category_name : (category_name + " - " + quest["value"]);

				JEOPARDY_QA_MAP[key] = {
					"question": quest,
					"answer"  : ans
				}
				
				category_questions_row += `<tr><td class='category category_option' data-jpd-quest-key=\"${key}\">${quest["value"]}</tr></td>`;
			});
			
			// The column
			let column = `<td colspan=\"colspan\" style='width:${dynamic_width}%;'><table class='category_column'>${category_name_row} ${category_questions_row}</table></td>`;

			if(isFinalJeopardy)
			{
				final_board += column;
			}
			else
			{
				// Add column for category to Game Board
				main_board += column;
			}
				
			// }
		});

		// Close both rows;
		main_board += "</tr>";
		final_board += "</tr>";
		
		let game_board = main_board + final_board;

		return game_board;
	}


	// Validate the game
	function validateJeopardyGame()
	{
		// Game categories;
		let categories = JEOPARDY_GAME.getCategories();

		// The errors list;
		let errors = []; 
		let finalJeopardyExists = false;

		// Loop through the categories;
		categories.forEach( (category) =>{

			let questionCount = category.getQuestionCount();
			let categoryName = category.getName();

			// Check if category has enough questions
			if ( questionCount  != 5 && !category.isFinalJeopardy() )
			{
				errors.push(`The category ${categoryName} has ${questionCount} questions. It should have 5.`);
			}

			// Check if Final Jeopardy is setup incorrect;
			if ( category.isFinalJeopardy() )
			{
				if(finalJeopardyExists)
				{
					errors.push(`There should be a single "FINAL JEOPARDY" category.`)
				}
				else if (questionCount > 1)
				{
					errors.push(`The FINAL JEOPARDY! category should only have 1 question. You have ${questionCount}`);
				}

				// Indicate that a final jeopardy exists
				finalJeopardyExists = true;
			}
		});

		return errors;

	}


	// Validate the spreadsheet data
	function validateSpreadsheetColumns(spreadsheetData)
	{
		// First, determine if the data is as expected
		expectedHeaders = [
				"Category Name",
				"Score Value",
				"Daily Double?",
				"Question (Text)",
				"Question (Audio)",
				"Question (Image)",
				"Question (URL)",
				"Answer (Text)",
				"Answer (Audio)",
				"Answer (Image)",
				"Answer (URL)"
			];

		givenHeaders = spreadsheetData["headers"] ?? [];
		isExpectedHeaders = (expectedHeaders.join(",") == givenHeaders.join(","));

		errors = [];

		if(!isExpectedHeaders)
		{
			errors.push("<br/>Make sure you have the right headers.")
		}
		return errors
	}