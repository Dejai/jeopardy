/*************************************
	Joepardy Generic Variables
***********************************/
	var JEOPARDY_GAME = undefined;
	var JEOPARDY_QA_MAP = {};

/*************************************
	Joepardy Classes/Models
***********************************/
	class Jeopardy
	{
		constructor(rows)
		{
			// this.name = name
			this.categories = [];
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
	
					// If category does not exist yet, add it;
					if(!this.categoryExists(category_name))
					{
						this.addCategory( new Category(category_name) );
					}
	
					this.getCategory(category_name).addQuestion(new_question);
				}
			});
		}

		addCategory(category)
		{
			this.categories.push(category);
		}

		getCategories()
		{
			return this.categories;
		}

		getCategory(name)
		{
			let theCategory = {};
			this.categories.forEach(function(obj){
				if(obj.getName() == name)
				{
					theCategory = obj; 
				}
			});
			return theCategory;
		}

		categoryExists(name)
		{
			let names = [];
			this.categories.forEach(function(obj){
				names.push(obj.getName());
			});
			return names.includes(name);
		}
	};

	class Category
	{
		constructor(name)
		{
			this.name = name;
			this.questions = [];
			this.finalJeopardy = this.setIsFinalJeopardy();
		}

		setIsFinalJeopardy()
		{
			let bool = false;
			let formatted = this.name.toUpperCase().replace(" ", "");
			if(formatted == "FINALJEOPARDY" || formatted == "FINALJEOPARDY!")
			{
				bool = true;
			}
			return bool;
		}

		addQuestion(question)
		{
			this.questions.push(question);
		}

		getName(){ return this.name; }

		isFinalJeopardy() { return this.finalJeopardy; }

		getQuestions()
		{
			return this.questions;
		}
	}

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


/*************************************
	Joepardy Helper Functions
***********************************/

	// Create the Game Board TABLE
	function getJeopardyGameBoard()
	{
		Logger.log("Creating the Game Board.");
		console.log("THE NEW WAY!");

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
			category_name_row 		= `<tr><th class='category category_title ${howToPlayClass}' data-jpd-category-name=\"${category_name}\">${howToPlaySpan}${preFilledCategoryName}</th></tr>`;
			
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
