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
		// Deleting a question
		deleteQuestion(value)
		{
			this.Questions.forEach( (question, idx)=>{
				if(question.Value == value)
				{
					 this.Questions.splice(idx,1); 
					 // Update value of questions after removing
					this.reValueQuestions();
					return;
				}
			});
		}
		// Re-value questions after deleting one
		reValueQuestions(){ 
			this.Questions.forEach( (q,i)=>{ q.Value = ( (this.ValueCount) * (i+1)) }); 
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

		// Get question formatted for the game
		getQuestionHTML(jeopardyInstance)
		{
			let content = "";
			let newLine = "<br/>";

			let imageHTML = "";
			let audioHTML = "";
			let textHTML = "";
			let urlHTML = ""

			// Add the Media components to the content (if applicable);
			if(this.Image != ""){ imageHTML = jeopardyInstance.getMediaHTML(this.Image); }
			if(this.Audio != ""){ audioHTML = jeopardyInstance.getMediaHTML(this.Audio); }
			if(this.Text != ""){ textHTML = JeopardyHelper.formatText(this.Text); }
			if(this.URL != ""){ urlHTML = JeopardyHelper.formatURL(this.URL); }

			// Add the pieces to the overall content
			content += (content != "") ? (newLine + imageHTML) : imageHTML;
			content += (content != "") ? (newLine + audioHTML) : audioHTML;
			content += (content != "") ? (newLine + textHTML) : textHTML;
			content += (content != "") ? (newLine + urlHTML) : urlHTML;

			return content;
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

		// Get answer formatted for the game
		getAnswerHTML(jeopardyInstance)
		{
			let content = "";
			let newLine = "<br/>";

			let imageHTML = "";
			let audioHTML = "";
			let textHTML = "";
			let urlHTML = ""

			// Add the Media components to the content (if applicable);
			if(this.Image != ""){ imageHTML = jeopardyInstance.getMediaHTML(this.Image); }
			if(this.Audio != ""){ audioHTML = jeopardyInstance.getMediaHTML(this.Audio); }
			if(this.Text != ""){ textHTML = JeopardyHelper.formatText(this.Text); }
			if(this.URL != ""){ urlHTML = JeopardyHelper.formatURL(this.URL); }

			// Add the pieces to the overall content
			content += (content != "") ? (newLine + imageHTML) : imageHTML;
			content += (content != "") ? (newLine + audioHTML) : audioHTML;
			content += (content != "") ? (newLine + textHTML) : textHTML;
			content += (content != "") ? (newLine + urlHTML) : urlHTML;

			return content;
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
		createConfiguration(jsonObj)
		{
			if(jsonObj != undefined)
			{
				let configJSON = JeopardyHelper.getJSON(jsonObj);
				// configMap = typeof(configMap) == 'string' ? JSON.parse(configMap) : configMap;
				let configKeys = Object.keys(configJSON);
				configKeys.forEach( (configKey)=> {
					let keyName = JeopardyHelper.getKeyName(configKey);
					this[keyName] = configJSON[configKey];
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

		// Get the formatted HTML for the media;
		getMediaHTML(isAudioAutoPlay=false)
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
			this.GameID = gameID;

			// Set updatable values
			this.setGameName(gameName);
			this.setGamePass("");

			// List for the key parts of the game
			this.Categories = []
			this.Config = new Config();
			this.Media = []
			// Store the attachment IDs for the different files
			this.Attachments = {}

			// Keep track of the game being tested
			this.Tested = false;

			// Keep a map of questions/answers (used for board)
			this.QAMap = {}
		}

	/* Subsection: Game * */
		newGame(code){ this.Game = new Game(code) }
	
	/* Subsection: Categories * */
		// Get the list of categories
		getCategories()
		{ 
			let listOfCategories = this.Categories;
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
				this.Categories.push( new Category(category) );
			});
		}
		// Add a new category (single)
		addCategory(jsonObj){ this.setCategories([jsonObj]); }
		// Get a specific category from this game;
		getCategory(name)
		{
			let theCategory = undefined;
			this.Categories.forEach((category)=>{
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
		// Delete a category
		deleteCategory(categoryName)
		{
			this.Categories.forEach( (category, idx)=>{
				if(category.Name == categoryName){ this.Categories.splice(idx,1); return; }
			});
		}


	/* Subsection: Media * */
		getMediaHTML(mediaID, autoPlay=false)
		{
			let filtered = this.Media?.filter((media)=>{
				return (media.ID == mediaID);
			});
			let mediaHTML = filtered[0]?.getMediaHTML(autoPlay)  ?? "";
			return mediaHTML;
		}
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

		
	/* Subsection: Game Name & Password */
		// Set a new Game Name
		setGameName(name){ this.gameName = name; }
		// Get the name of the game
		getGameName(){ return this.gameName; }
		// Get the game ID
		getGameID(){ return this.GameID; }
		// Set the passphrase for the game
		setGamePass(pass){ this.gamePass = pass; }
		// Get the game passphrase
		getGamePass(){ return this.gamePass; }

	/* Subsection: The Game Board */
		
		// Get/Set the game board
		getGameBoard(callback)
		{
			// Loop through categories to build board
			this.getCategories()?.forEach( (category, idx, array)=> {

				// Is this the final Jeopardy category;
				let isFinalJeopardyCategory = category.isFinalJeopardy();

				// Determine the width of this category
				let width = (isFinalJeopardyCategory) ? 100 : 100 * (1 / (this.Categories.length-1) );
				let dynamicWidth = `style="width:${width}%;"`;
				
				// Loop through the questions in this category; Set key
				let questions = category.Questions;
				questions.forEach((q)=>{
					let key = `${category.Name}-${q.Value}`;
					q.Key = key;
					q.Value = (isFinalJeopardyCategory) ? category.Name : q.Value;
					// Add question to the game
					this.Game.addQuestion(key,q);
				});
	
				// Set the question templates
				MyTemplates.getTemplate("board/templates/boardQuestion.html", questions, (questionsTemplate)=>{
					
					// The category template object
					let categoryObj = {
							"DynamicWidth": dynamicWidth,
							"CategoryName":(isFinalJeopardyCategory) ? "" : category.Name,
							"PreFilledCategoryName":(isFinalJeopardyCategory) ? "Final Jeopardy!" : "",
							"Questions":questionsTemplate,
						}
					// Set the category templates;
					MyTemplates.getTemplate("board/templates/boardCategory.html", categoryObj, (categoriesTemplate)=>{
						callback(categoriesTemplate,isFinalJeopardyCategory);
					});
				});
			});
		}


	/* Subsection: Attachments */
		// Set/Get: Attachment ID
		setAttachments(jsonObj)
		{
			let attachments = JeopardyHelper.getJSON(jsonObj);
			attachments?.forEach( (attachment)=>{
				if(attachment.fileName.includes(".json"))
				{
					this.Attachments[attachment.fileName] = attachment.id;
				}
			});	
		}
		// Set a single attachment id
		setAttachmentID(name, id){ this.Attachments[name] = id; }
		// Get the attachment id
		getAttachmentID(name){ return this.Attachments[name] ?? ""; }
	
	/* Subsection: Game validation */
		// Checks if the game is valid & returns messages accordingly
		isValidGame()
		{

			let results = {
				"IsValid": false, 
				"Messages":[] 
			};
			
			let sameLengthCategories = false;
			let hasFinalJeopardy = false;
			let finalJeopardyOneQuestion = false;

			// Set of unique question lengths;
			let questionLengths = new Set();

			// Loop through the categories;
			this.Categories.forEach( (category)=>{
				// Check for final jeopardy
				if(category.FinalJeopardy == "Yes"){ hasFinalJeopardy = true; }
				// Check for final jeopardy with one question
				if(category.FinalJeopardy == "Yes" && category.Questions.length == 1){ finalJeopardyOneQuestion = true; }
				// Capture the length of each category
				// questionLengths.add(category.Questions.length);
				if(category.FinalJeopardy == "No")
				{
					let length = category.Questions.length;
					questionLengths.add(length);
				}
				sameLengthCategories = (questionLengths.size == 1);
			});

			if(!sameLengthCategories){ results.Messages.push("Each category must have the same amount of questions"); }
			if(!hasFinalJeopardy){ results.Messages.push("You must have a category that is for Final Jeopardy!"); }
			if(hasFinalJeopardy && !finalJeopardyOneQuestion){ results.Messages.push("The Final Jeopardy! category should have one question"); }

			// Determine if the results are all good
			results.IsValid = (sameLengthCategories && hasFinalJeopardy && finalJeopardyOneQuestion);

			return results; 
		}
	};

/****** CLASS: "Game" ; This stores details specific to a single game of Jeopardy ********/

	class Game 
	{
		constructor(code)
		{
			this.Code = code;
			this.ListID = undefined;

			// Keeping track of questions/answers
			this.QAMap = {};
			this.Asked = []; //Keeps track of questions already asked;

			// Keep track of teams in this game;
			this.Teams = [];
			this.CurrentTeamIdx = -1;
			this.PlayerSelected = false;
			this.LastTeamCorrect = undefined;

			// Keep track of game state
			this.AllHeadersVisible = false;
			this.HeadersVisible = 0;
			this.IsFinalJeopardy = false;
			this.IsTestRun = false;
			this.IsOver = false;
		}

		// Add the list ID
		setListID(listID){ this.ListID = listID; }
		getListID(){ return this.ListID; }


		// Get the game code
		getCode(){ return this.Code; }

		// Add a question for the game
		addQuestion(key, question){ this.QAMap[key] = question; }
		// Get a question
		getQuestion(key)
		{
			let question = undefined;
			
			let questObj = this.QAMap[key] ?? undefined;
			if(questObj != undefined)
			{
				question = questObj;
				this.Asked.push(key);
				console.log("Process all the question; Including audio/images");
			}
			return question;
		}

		// Add a team (if not already exists)
		addTeam(jsonObj)
		{
			let added = false;
			let teamObj = JeopardyHelper.getJSON(jsonObj);
			let gameCard = teamObj?.Name?.includes("GAME_CARD_");
			if(this.getTeam(teamObj?.Code) == undefined && !gameCard)
			{
				this.Teams.push(teamObj);
				added = true;
			}
			return added;
		}
		// Get a team based on their code
		getTeam(code)
		{
			let result = this.Teams.filter((team)=>{
				return (team.Code == code);
			});
			let team = result[0] ?? undefined;
			return team
		}

		// Set the current team
		setCurrentTeam(mode, code)
		{
			let teamName = undefined;
			switch(mode)
			{	
				// Next Available (everyone gets a turn)
				case "1":
					let nextIdx = this.CurrentTeamIdx+1
					nextIdx = (nextIdx >= this.Teams.length) ? 0 : nextIdx;
					teamName = this.Teams[nextIdx]?.Name ?? undefined;
					break;

				// Select directly by code
				case "2":
					teamName = this.getTeam(code)?.Name ?? undefined;
					this.LastTeamCorrect = code;
					break;

				// Questions picked randomy, so no need for this
				case "3":
					teamName = ""; // Empty team name; But not undefined;
					break;
					
				// Defaults to next option
				default:
					let idx = Math.floor(Math.random() * this.Teams.length);
					let team = this.Teams.length[idx];
					teamName = team?.Name;
			}
			this.PlayerSelected = (teamName != undefined);
			return teamName; 
		}
	}

	

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
		},

		// Format text for Questions/Answers
		formatText: (value)=>{
			formatted = "";
			value = value.trim();
			Logger.log("Text value: " + value);
	
	
			if(value.trim() != "")
			{
				let new_value = value.trim()
							.replaceAll("\\n", "<br/>")
							.replaceAll("{subtext}", "<span class='jpd_subtext'>")
							.replaceAll("{/subtext}", "</span>")
							.replaceAll("{bold}", "<strong><em>")
							.replaceAll("{/bold}", "</em></strong>");
				formatted = `<span>${new_value}</span>`
			}
			return formatted;
		},

		// Format a URL
		formatURL: (value)=>{
			formatted = "";
			value = value.trim();
			Logger.log("Hyperlink value: " + value);

			if(value != "")
			{
				formatted = `<a class='answer_link' href=\"${value}\" target='_blank'>${value}</a>`;
			}
			return formatted;
		}

	}

	function formatURL(value)
	{
		
	}