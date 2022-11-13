/************Jeopardy Generic Variables**********************/
	var JEOPARDY_GAME = undefined;
	var JEOPARDY_QA_MAP = {};

/****** CLASS: "Category" ; For the different categories in a game ********/

	class Category
	{
		constructor(jsonObj)
		{
			var categoryObject = JeopardyHelper.getJSON(jsonObj);

			// Set the common things of a category
			this.Name = categoryObject.Name;
			this.Order = categoryObject.Order;
			this.FinalJeopardy = categoryObject.FinalJeopardy;
			this.ValueCount = 100;

			// Set the questions
			this.Questions = [];
			this.setQuestions(categoryObject.Questions ?? []);			
		}

		// Return if this category is the final jeopardy
		isFinalJeopardy() { return (this.FinalJeopardy == "Yes"); }

		// Get the category name;
		getName(){ return this.name; }

		// Get/Set the questions of this category;
		getQuestions()
		{ 
			let theListOfQuestions = this.Questions;
			theListOfQuestions.sort( (a,b)=>{
				if(a["Value"] < b["Value"]){ return -1; }
				if(a["Value"] > b["Value"]){ return 1; }
				return 0;
			});
			return theListOfQuestions; 
		}
		// Get a single question
		getQuestion(value)
		{
			let theQuestion = undefined
			this.Questions?.forEach( (quest)=>{
				if(quest.Value == value)
				{
					theQuestion = quest
				}
			});
			return theQuestion
		}
		// Add a new question to this category
		addQuestion(jsonObj){  this.Questions.push( new CategoryQuestion(jsonObj) ); }
		setQuestions(listOfQuestions)
		{
			listOfQuestions?.forEach( (question)=>{
				this.addQuestion(question);
			});
		}
		// Updating the questions in a category
		updateCategoryQuestion(jsonObj)
		{
			let questionObj = JeopardyHelper.getJSON(jsonObj);
			let questionToUpdate = this.getQuestion(questionObj?.Value ?? "");

			let status = false;
			// If not existing question - add new question
			if(questionToUpdate == undefined)
			{
				this.addQuestion(jsonObj);
				status = true;
			}
			else
			{
				// Update the CategoryQuestion and questions
				let categoryQuestionUpdated = questionToUpdate.updateQuestion(jsonObj);
				let questionUpdated = questionToUpdate.Question.updateQuestion(jsonObj.Question);
				let answerUpdated = questionToUpdate.Answer.updateAnswer(jsonObj.Answer);

				status = (categoryQuestionUpdated && questionUpdated && answerUpdated )
			}
			return status;
		}

		// Get the next value number
		getNextValue(){ return (this.Questions.length+1) * this.ValueCount; }

		// Get the question count of this category;
		getQuestionCount(){ return this.questions.length; }
	}

/****** CLASS: "CategoryQuestion" ; For the different questions in a cetegory ********/

	class CategoryQuestion
	{

		constructor(jsonObj)
		{
			// The JSON object from the question
			var categoryQuestionObject = JeopardyHelper.getJSON(jsonObj);
			if(categoryQuestionObject != undefined)
			{
				// Set the value & dailydouble details
				this.Value = categoryQuestionObject.Value;
				this.DailyDouble    = categoryQuestionObject.DailyDouble;
				this.Question = new Question(categoryQuestionObject.Question);
				this.Answer = new Answer(categoryQuestionObject.Answer);
			}
		}

		// Getters
		getValue(){ return this.Value; }

		// Get the question part object
		getQuestion(){ return JSON.stringify(this.Question); }
		updateQuestion(jsonObj)
		{
			this.Value = Number(jsonObj.Value);
			this.DailyDouble = jsonObj.DailyDouble;
			return true;
		}

		// Get the answer part object
		getAnswer(){ return JSON.stringify(this.Answer); }
	}

/****** CLASS: "Question" ; For the question parts of a question ********/

	class Question 
	{
		constructor(jsonObj)
		{
			this.Text 	= JeopardyHelper.formatContent(jsonObj.Text);
			this.Audio 	= jsonObj.Audio;
			this.Image 	= jsonObj.Image;
			this.URL	= jsonObj.URL;
		}

		updateQuestion(jsonObj)
		{
			this.Text = jsonObj.Text;
			this.Audio = jsonObj.Audio;
			this.Image = jsonObj.Image;
			this.URL = jsonObj.URL;
			return true;
		}
	}

/****** CLASS: "Answer" ; For the parts of an answer ********/

	class Answer 
	{
		constructor(jsonObj)
		{
			this.Text 	= JeopardyHelper.formatContent(jsonObj.Text);
			this.Audio 	= jsonObj.Audio;
			this.Image 	= jsonObj.Image;
			this.URL	= jsonObj.URL;
		}

		updateAnswer(jsonObj)
		{
			this.Text = jsonObj.Text;
			this.Audio = jsonObj.Audio;
			this.Image = jsonObj.Image;
			this.URL = jsonObj.URL;
			return true;
		}
	}

/****** CLASS: "Config" ; For the config settings (i.e. rules) for a game ********/

	class Config 
	{
		constructor(configMap = undefined)
		{
			this.createConfiguration(configMap);
		}

		// Set instance data
		createConfiguration(configMap)
		{

			if(configMap != undefined)
			{
				configMap = typeof(configMap) == 'string' ? JSON.parse(configMap) : configMap;
				let configKeys = Object.keys(configMap);
				configKeys.forEach( (configKey)=> {
					let keyName = JeopardyHelper.getKeyName(configKey);
					this[keyName] = configMap[configKey];
				});
			}
		}

		// Update a particular configuration
		setConfiguration(name,obj)
		{
			let keyName = JeopardyHelper.getKeyName(name);
			if(this[keyName] != undefined)
			{
				this[keyName] = obj;
			}
		}

		// Get a configuration based on name
		getConfiguration(name)
		{
			let keyName = JeopardyHelper.getKeyName(name);
			let config = {};
			if(this[keyName] != undefined)
			{
				config = this[keyName];   
			}
			return config;
		}		

		// Get this configuration as a JSON object
		getConfigJSON()
		{
			return JSON.stringify(this);
		}
	}

/****** CLASS: "Media" ; For the media files associated with questions in the game ********/

	class Media 
	{
		constructor(jsonObj)
		{
			var mediaObject = JeopardyHelper.getJSON(jsonObj);
			if(mediaObject != undefined)
			{
				// Set the value & dailydouble details
				this.ID = mediaObject.ID;
				this.Name = mediaObject.Name;
				this.Type = mediaObject.Type;
				this.Src = mediaObject.Src;
				this.IsActive = mediaObject.IsActive ?? true;
			}
		}

		getMediaHTML(isAudioAutoPlay)
		{
			let html = "";
			if(this.Type == "Image")
			{
				html = `<img src="${this.Src}" alt="Image" class='jeopardy_image'/>`
			}
			else if (this.Type == "Audio")
			{
				let autoplay = (isAudioAutoPlay) ? " autoplay" : "";
				let controls = (isAudioAutoPlay) ? "" : " controls";
				html = `<audio ${autoplay} ${controls}>
							<source src="${this.Src}" type='audio/mpeg'/>
						</audio>`;
			}
			return html;
		}

		getOptionHtml()
		{
			return `<option value="${this.ID}">${this.Name}</option>`;
		}
	}
	
/****** CLASS: "Jeopardy" ; The main Jeopardy model that connects it all; ********/

	class Jeopardy
	{
		constructor(gameID, gameName)
		{
			this.gameID = gameID;

			// Set updatable values
			this.setGameName(gameName);
			this.setGamePass("");

			// List for larger object
			this.categories = []

			// List of smaller objects
			this.config = new Config();
			this.Media = []

			// Store the attachment IDs for the different files
			this.attachmentIDs = {}
		}

	/* Subsection: Categories * */
		// Get the list of categories
		getCategories()
		{ 
			let listOfCategories = this.categories;
			listOfCategories.sort( (a,b)=>{
				if(a["Order"] < b["Order"]){ return -1; }
				if(a["Order"] > b["Order"]){ return 1; }
				return 0;
			});
			return listOfCategories; 
		}
		// Adding new categories (by list)
		setCategories(jsonObj)
		{
			// Get the Category object & create accordingly
			var categoriesObject = JeopardyHelper.getJSON(jsonObj);
			categoriesObject?.forEach( (category)=>{
				this.categories.push( new Category(category) );
			});
		}
		// Add a new category (single)
		addCategory(jsonObj){ this.setCategories([jsonObj]); }
		// Get a specific category from this game;
		getCategory(name)
		{
			let theCategory = undefined;
			this.categories.forEach((category)=>{
				if(category.Name == name)
				{
					theCategory = category
				}
			});
			return theCategory
		}
		// Update the CategoryQuestion object
		updateCategoryQuestion(categoryName, questionObject)
		{
			let category = this.getCategory(categoryName);
			let pass = category.updateCategoryQuestion(questionObject);
			return pass;
		}
		// Updating a question (or adding new if it doesn't exist)
		updateCategory(jsonObj)
		{
			// The new passed in category
			let newCategoryObj = JeopardyHelper.getJSON(jsonObj);

			// The existing category (if exists)
			let existingCategory = this.getCategory(newCategoryObj?.ID ?? "")

			if(existingCategory != undefined)
			{
				existingCategory.Name = newCategoryObj?.Name ?? existingCategory.Name;
				existingCategory.Order = newCategoryObj?.Order ?? existingCategory.Order;
				existingCategory.FinalJeopardy = newCategoryObj?.FinalJeopardy ?? existingCategory.FinalJeopardy;
				existingCategory.ValueCount = newCategoryObj?.ValueCount ?? existingCategory.ValueCount;
			}
		}

	/* Subsection: Categories * */
		// Get/Set the media files
		getMedia(name)
		{ 
			let theMedia = undefined;
			this.Media?.forEach( (media)=>{
				if(media.Name == name)
				{
					theMedia = media;
				}
			});
			return theMedia;
		}
		// Get the list of media (with option to include inactive ones)
		getListOfMedia(includeInactive=false)
		{
			let theListOfMedia = []
			this.Media.forEach((media)=>{
				if(media.IsActive || (!media.IsActive && includeInactive))
				{
					theListOfMedia.push(media);
				}
			});
			theListOfMedia.sort( (a,b)=>{
				if(a["Type"] < b["Type"]){ return -1; }
				if(a["Type"] > b["Type"]){ return 1; }
				return 0;
			});
			return theListOfMedia;
		}
		// Get list of <option> tags for the different type of media
		getMediaOptions(type)
		{
			let media = this.getListOfMedia();
			let options = "<option value=''>Select one ... </option>";
			media.forEach((item)=>{
				options += (item.Type == type) ? item.getOptionHtml() : "";
			});
			return options;
		}
		// Add a new media object (by list)
		setMedia(jsonObj)
		{
			var mediaObject = JeopardyHelper.getJSON(jsonObj);
			mediaObject.forEach( (media) =>{
				this.Media.push( new Media(media) );
			});
		}
		// Add new media (single)
		addMedia(jsonObj){ this.setMedia([jsonObj]); }
		// Change a media to Inactive, based on ID
		setMediaToInactive(mediaID)
		{
			this.Media?.forEach( (media, idx)=>{
				if(media.ID == mediaID)
				{
					media.IsActive = false;
				}
			});
		}
		
	/* Subsection: Game Name */
		// Set a new Game Name
		setGameName(name){ this.gameName = name; }
		// Get the name of the game
		getGameName(){ return this.gameName; }

		// Get the game ID
		getGameID(){ return this.gameID; }

		// Get the game passphrase
		getGamePass(){ return this.gamePass; }

		// Get the game board
		getGameBoard()
		{
			// Two "boards" - regular round and final jeopardy
			var main_board = "<tr id=\"round_1_row\" class=\"hidden\">";
			var final_board = "<tr id=\"final_jeopardy_row\" class=\"hidden\">";

			// Get categories;
			let categories = this.getCategories();
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
	/* Subsection: Attachments */
		// Set/Get: Attachment ID
		setAttachmentID(name, id){ this.attachmentIDs[name] = id; }
		getAttachmentID(name){ return this.attachmentIDs[name] ?? ""; }

		// Set the passphrase for the game
		setGamePass(pass){ this.gamePass = pass; }

		// Check if category name exists
		isExistingCategory(name){ return Object.keys(this.categories).includes(name); }
	};



/****** CONST: "JeopardyHelper" ; For general helper methods used by multiple classes ********/
	const JeopardyHelper = 
	{

		// Converts a given value into a PascalCase keyname
		getKeyName: (value) => {
			let keyName = "";
			if(value == undefined)
				return keyName;

			let parts = value.split(" ");
			parts.forEach((part)=>{
				keyName += (part[0].toUpperCase() + part.substring(1)).replaceAll("?", "")
			});
			return keyName;
		},

		// Return a JSON object;
		getJSON: (jsonObj) => {
			var jsonObject = typeof(jsonObj) == 'string' ? JSON.parse(jsonObj) : jsonObj;
			return jsonObject;
		},

		// Form the content;
		formatContent: (value) => {
			let formatted = value.replaceAll(/((^|\s))\"/g, "$1&#8220;").replaceAll(/\"/g, "&#8221;")
			return formatted
		}
	}











/*********** TO BE DELETED: Jeopardy Helper Functions *********************/

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
