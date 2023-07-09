// The instance of this jeopardy game
const JeopardyGame = new Jeopardy();
var CurrentSection = ""; 
var SectionsToBeSaved = []; // Keep track of sections that should be saved
var TestListID = undefined;
var WindowScroll = {"X":0, "Y":0} // Used for tracking going back to scroll position
var LoadingGIF =  `<img class="component_saving_gif" src="https://dejai.github.io/scripts/assets/img/loading1.gif" style="width:10%;height:10%;">`

/****************  HOST: ON PAGE LOAD ****************************/ 
	
	mydoc.ready( async () => {
		// Set board name
		MyTrello.SetBoardName("jeopardy");

		// Make sure the page doesn't close once the game starts
		window.addEventListener("beforeunload", onClosePage);
		onKeyboardKeyup();

		let gameID = mydoc.get_query_param("gameid");
		if(gameID != undefined) {

			let labels = await Promises.GetTrelloLabels();
			JeopardyGame.setTrelloLabels(labels);

			let trelloCard = await Promises.GetTrelloCard(gameID);
			if(trelloCard == undefined){
				onSetLoadingMessage("Something went wrong:<br/>Could not load this game.");
				return;
			}

			// Get game pieces
			var gameName = trelloCard?.["name"] ?? "";
			var gameDesc = trelloCard?.["desc"] ?? "";
			var attachments = trelloCard?.["attachments"] ?? "";
			var gameLabels = trelloCard?.["idLabels"] ?? [];

			// Set the pieces
			JeopardyGame.setGameID(gameID);
			JeopardyGame.setGameName(gameName);
			JeopardyGame.setGameDesc(gameDesc);
			JeopardyGame.setGameLabels(gameLabels);

			// Set the game name (even before validation);
			onSetGameName();

			// Set up teh attachments
			JeopardyGame.setAttachments(attachments);

			console.log(JeopardyGame);

			// Validate the access
			await onValidateAccess(gameID);

			// Set the question popup
			onSetQuestionPopup();
			
			// Set the default section that is displayed
			onSetDefaultSection();

			// Always get the test list ID
			onGetTestListID();

			// Load all the tabs
			await onLoadAllTabs();

			// Show the TEST vs. PLAY section
			onShowTestOrPlay();

		} else {
			// Navigate to load page if no game ID is present
			location.assign("/host/load/");
		}
	});

	// Listener for keyboard event = keyup
	function onKeyboardKeyup()
	{
		document.addEventListener("keyup", function(event)
		{
			switch(event.code)
			{
				case "Escape":
					onCloseQuestion();
					break;
				default:
					return;
			}
		});
	}

	// Create or return an instance of the Jeopardy game
	function onCreateJeopardyGame(gameID, gameName, gameDesc="")
	{
		JeopardyGame = (JeopardyGame == undefined) ? new Jeopardy(gameID, gameName, gameDesc) : JeopardyGame;
		return JeopardyGame
	}

	// Prevent the page accidentally closing
	function onClosePage(event)
	{
		if(SectionsToBeSaved.length > 0)
		{
			event.preventDefault();
			event.returnValue='';
		}
	}

	// Show/hide the loading GIF
	function onToggleLoading(state) {
		switch(state) {
			case "show":
				mydoc.showContent("#loading_gif");		
				break;
		
			// in all else situation, just hie
			default:
				mydoc.hideContent("#loading_gif");		
		}
	}

	// Load all tabs
	async function onLoadAllTabs(){
		await loadTabContent("gameSettings");
		await loadTabContent("gameMedia");
		await loadTabContent("questionsAnswers");
	}

	// Setting a message based on loading 
	function onSetLoadingMessage(value)
	{
		onToggleLoading("hide");
		mydoc.setContent("#loading_results_section", {"innerHTML":value});
	}

	// Publishing a game
	async function onPublishGame(){
		var publishLabelID = JeopardyGame.TrelloLabels["Not Published"] ?? "";
		let confirmAction = confirm("Are you sure you want to PUBLISH this game?");
		if(confirmAction) {
			let remove = await Promises.RemoveTrelloLabel(JeopardyGame.getGameID(), publishLabelID);
			location.reload();
		}
	}

	// Unpublish a game
	async function onUnPublishGame(){
		var publishLabelID = JeopardyGame.TrelloLabels["Not Published"] ?? "";
		let confirmAction = confirm("Are you sure you want to UNPUBLISH this game?");
		if(confirmAction) {
			let remove = await Promises.AddTrelloLabel(JeopardyGame.getGameID(), publishLabelID);
			location.reload();
		}
	}

/***** BEGIN: Key things to set/do when getting started ****************************/ 

	// Check if a valid password has been entered or saved
	function onValidPasswordAsync(gameID)
	{
		return new Promise( resolve =>{
			// Get the password details
			let gamePasswordCookie = mydoc.getCookie(gameID) ?? ""
			let gamePasswordForm = mydoc.getContent("#loginForm #loginPassPhrase")?.value ?? "";
			let password = (gamePasswordCookie != "") ? gamePasswordCookie : gamePasswordForm;

			MyTrello.get_card_custom_field_by_name(gameID, "Pass Phrase", (data) => {
				let response = JSON.parse(data.responseText);
				let customFieldValue = response[0]?.value?.text ?? ""
				
				// Return if the password is what is expected
				let isValidPassword = (customFieldValue != "" && customFieldValue.toUpperCase() == password.toUpperCase());
				
				// Set the password in the Jeopardy object
				if (isValidPassword){ 

					JeopardyGame.setGamePass(customFieldValue); 

					// If cookie not already set, then set it;
					if(gamePasswordCookie == ""){ 
						mydoc.setCookie(gameID,customFieldValue,30); 
					}
				}

				resolve( isValidPassword );
			});
		});
	}

	// Validate the user entered password
	function onSubmitLoginForm(event)
	{
		event.preventDefault();
		// Loading gif
		mydoc.setContent("#loginLoading", {innerHTML:LoadingGIF});
		let gameID = JeopardyGame.getGameID();
		console.log(gameID);
		onValidateAccess(gameID, true);

	}

	// Validate the access
	async function onValidateAccess(gameID, viaForm=false) {
		// Check if it is a valid password (await)
		let isValidPassword = await onValidPasswordAsync(gameID);
		if(isValidPassword) {
			// Get the game pass
			let gamePass = JeopardyGame.getGamePass(); 

			// Set the field with the game pass
			mydoc.setContent("#game_pass_phrase", {"value": gamePass });

			// Hide the login form
			onHideLoginForm();

			// Show the menu while the files load
			mydoc.showContent(".showOnLogin");
			mydoc.hideContent(".hideOnLogin");
			return;
		}
		// Show the login form if not right
		onShowLoginForm(viaForm);
	}

	// Show the login form
	function onShowLoginForm(badPassword=false)
	{
		// If we get here, show the option to
		onSetLoadingMessage("");
		mydoc.showContent("#sidebarNav .tab.login");
		mydoc.showContent("#edit_game_section");
		mydoc.showContent("#loginForm");

		// Show error message if we get here -- means, password was not correct
		if(badPassword)
		{
			mydoc.setContent("#loginLoading", {innerHTML:""});
			mydoc.setContent("#loginMessage", {innerHTML:"Incorrect password"});
		}
	}

	// Hide the login form
	function onHideLoginForm()
	{
		// Hide login tab & form
		mydoc.hideContent("#sidebarNav .tab.login");
		mydoc.hideContent("#loginForm");
	}

	// Get the first enabled tab from a list of given tabs
	function getEnabledTabID(tabs) {
		return Array.from(tabs)?.filter(x => !x.classList.contains("disabled"))?.[0]?.getAttribute("data-section-id") ?? "";
	}

	// Set a default tab
	function onSetDefaultSection()
	{
		let sectionParam = mydoc.get_query_param("section");
		var requestedTab    = getEnabledTabID( document.querySelectorAll(`[data-section-id="${sectionParam}"]`) );
		var firstEnabledTab = getEnabledTabID( document.querySelectorAll(".tab.section") );
		var tabToSet = (requestedTab != "") ? requestedTab : firstEnabledTab;
		console.log("Tab to set : " + tabToSet);

		document.querySelector(`[data-section-id="${tabToSet}"]`)?.click();
	}

	// Show/hide the TEST vs PLAY sections
	function onShowTestOrPlay(){
		if(JeopardyGame.isPublished()){
			mydoc.showContent(".showOnPublished");
			mydoc.hideContent(".hideOnPublished");
		} else {
			mydoc.showContent(".showOnUnpublished");
			mydoc.hideContent(".hideOnUnpublished");
		}
	}

	// Get the TEST list ID
	function onGetTestListID()
	{
		MyTrello.get_list_by_name( "TEST", (data)=>{
			let listsResp = JSON.parse(data.responseText);
			TestListID = listsResp[0]?.id ?? undefined;
		});
	}

/****** MAIN GAME PARTS: Get list of content & core setup things ****************************/ 

	// Set the game name
	function onSetGameName()
	{
		// Using name from JeopardyGame;
		var gameName = JeopardyGame.getGameName();
		mydoc.setContent("#game_name_value", {"value":gameName});
		mydoc.setContent("#edit_game_name", {"innerText":gameName});
	}

	// Set the game description
	function onSetGameDescription()
	{
		var gameDesc = JeopardyGame.getGameDesc();
		mydoc.setContent("#gameDescription", {"value":gameDesc});
	}

	// Set the game ID
	function onSetGameID()
	{
		var gameID = JeopardyGame.getGameID();
		mydoc.setContent("#read_only_game_id", {"innerText":gameID});
	}

	// Set the game Config/Rules
	async function onSetGameRules()
	{

		var rulesHTML = "";

		mydoc.setContent("#settings_table_body", {"innerHTML": LoadingGIF });

		// Loop through the rules
		for(var idx in Rules)
		{
			var ruleObj = Rules[idx];
			
			// Set related key & saved config;
			let ruleKey = JeopardyHelper.getKeyName(ruleObj.Name);
			let savedConfig = JeopardyGame.Config.getConfiguration(ruleKey);

			// Get formatted HTML (await)
			let html = await Promises.GetRulesFormHTML(ruleObj, ruleKey, savedConfig);

			rulesHTML += html; 
		}

		// Set HTML & trigger all the options
		mydoc.setContent("#settings_table_body", {"innerHTML": rulesHTML});
		document.querySelectorAll(".ruleOption")?.forEach( (ruleOpt)=>{
			onToggleRuleOptionDetails(ruleOpt);
		});
	}

	// Set the game questions
	async function onSetGameQuestions()
	{
		// The category HTML to load
		var categoryHTML = "";

		// Assume final jeopardy category is missing
		let missingFinalJeopardy = true;

		// The categories
		var theCategories = JeopardyGame.getCategories();

		// Loop through each category & build HTML templates;
		for(var idx in theCategories)
		{
			var category = theCategories[idx]; 
			let theHTML = await Promises.GetCategoryEditHTML(category);
			categoryHTML += theHTML;

			// Confirm if final jeopardy content is set
			if(category.isFinalJeopardy()){ missingFinalJeopardy = false; }
		}

		mydoc.setContent("#listOfCategories", {"innerHTML":categoryHTML});
		var _action = (missingFinalJeopardy) ?
					mydoc.removeClass(".addFinalJeopardyCategory","hidden")
					: mydoc.addClass(".addFinalJeopardyCategory", "hidden");

		return 1;
	}

	// Set the game media
	async function onSetGameMedia()
	{
		// Load the game-specific form URL
		let formURL = MyGoogleDrive.getFormURL(JeopardyGame.getGameID());
		let aHref =	document.getElementById("gameFormURL");
		if (aHref != undefined){ aHref.href = formURL; }
		
		// Media HTML list
		var mediaHTML = "";

		// Get the list of media files
		var mediaFiles = JeopardyGame.getListOfMedia() ?? [];
		// Clear out the N/A before setting media
		mydoc.setContent("#game_media", {"innerHTML": ""});

		// Get the media HTML for each item
		for (var idx in mediaFiles)
		{
			let media = mediaFiles[idx];
			let theHTML = await Promises.GetMediaEditHTML(media);
			if (idx > 0 && (idx+1) % 3 == 0){ theHTML += "<br style='clear:both;'>"; }
			mediaHTML += theHTML;
		}

		// Clear out anything before setting media
		mydoc.setContent("#game_media", {"innerHTML": ""});

		// Set the media content
		mydoc.setContent("#game_media", {"innerHTML": mediaHTML });
	}

/*** SAVE ACTIONS: Saving the game details ********/

	// Indicates that something should be saved
	function onChangeInSection()
	{
		if(!SectionsToBeSaved.includes(CurrentSection))
		{
			SectionsToBeSaved.push(CurrentSection);
		}

		// Show the button as something is to be saved
		if(SectionsToBeSaved.length > 0)
		{
			mydoc.showContent("#saveButton");
		}
	}

	// The general save -- keeps track of diffs & saves accordingly
	function onSaveGame()
	{
		// Switch what to save based on the section

		if(SectionsToBeSaved.length > 0)
		{
			mydoc.setContent("#saveButton", {"innerHTML":"SAVING ... "});
			mydoc.removeClass("#saveButton", "dlf_button_limegreen");
			mydoc.addClass("#saveButton", "dlf_button_gray");

			while(SectionsToBeSaved.length > 0)
			{
				let section = SectionsToBeSaved.pop();
				onSaveBySection(section);
			}

			// Reset  button;
			setTimeout(()=>{
				mydoc.removeClass("#saveButton", "dlf_button_gray");
				mydoc.addClass("#saveButton", "dlf_button_limegreen");
				mydoc.setContent("#saveButton", {"innerHTML":"SAVED"});

				// Final phase
				setTimeout(()=>{
					mydoc.setContent("#saveButton", {"innerHTML":"SAVE CHANGES"});
					mydoc.hideContent("#saveButton");
				}, 1500);

			}, 1500);
		}
	}

	// Save the details based on section
	function onSaveBySection(section)
	{
		Logger.log("Saving section = " + section);

		switch(section)
		{
			case "generalDetails":
				// Get the name of the game
				let savedName = JeopardyGame.getGameName();
				let newName =  mydoc.getContent("#game_name_value")?.value ?? savedName;

				// Get the descriptoin
				let savedDesc = JeopardyGame.getGameDesc();
				let newDesc =  mydoc.getContent("#gameDescription")?.value ?? savedDesc;

				// Get the passphrase
				let savedPass = JeopardyGame.getGamePass();
				let newPass = mydoc.getContent("#game_pass_phrase")?.value ?? savedPass;

				// Save the details
				onSaveGameDetails(newName, newDesc, newPass);
				break;
			case "gameSettings":
				onSaveGameFile(JSON.stringify(JeopardyGame.Config), "config.json");
				break;
			case "questionsAnswers":
				onSaveGameFile(JSON.stringify(JeopardyGame.Categories), "categories.json");
				break;
			case "gameMedia":
				onSaveGameFile(JSON.stringify(JeopardyGame.Media), "media.json");
				break;
			default:
				
		}
	}

	// Save the basic game details
	function onSaveGameDetails(newName,newDesc,newPass)
	{
		Logger.log("Updating Game Details");

		let gameID = JeopardyGame.getGameID() ?? "";

		if(gameID != "")
		{
			// Game name
			MyTrello.update_card_name(gameID, newName, (data)=>{
				if(data.status >= 200 && data.status < 300)
				{
					JeopardyGame.setGameName(newName);
					onSetGameName();
				}
			});

			// Game description
			MyTrello.update_card_description(gameID, newDesc, (data)=>{
				if(data.status >= 200 && data.status < 300)
				{
					Logger.log("Updated description");
				}
			});

			// Game pass
			MyTrello.update_card_custom_field_by_name(gameID, "Pass Phrase", newPass, (data)=> {

				if(data.status >= 200 && data.status < 300)
				{
					Logger.log("Updated custom field == Pass Phrase");
				}
			});
		}
	}

	// Save one of the config files (config, category, media, etc?)
	function onSaveGameFile(jsonString, fileName)
	{
		var gameID = JeopardyGame.getGameID();
		var currAttachmentID = JeopardyGame.getAttachmentID(fileName);

		// Save the config file
		MyTrello.create_card_attachment(gameID,fileName,jsonString,(data)=>{
			if(data.status >= 200 && data.status < 300)
			{
				let newFile = myajax.GetJSON(data.responseText);
				JeopardyGame.setAttachmentID(fileName, newFile.id);
				MyTrello.delete_card_attachment(JeopardyGame.getGameID(),currAttachmentID,(data)=>{
					Logger.log(data.responseText);
				});
			}
		}, (err)=>{ console.error(err);});
	}


/***** SWITCH/TOGGLE ACTIONS: Actions that involve a switch/toggle in stateof page */
	
	// Function to manage loading content of a tab
	async function loadTabContent(targetSection)
	{
		// Check if tab is already loaded; Don't load again if already loaded
		let sectionLoadedClass = "sectionLoaded"
		let isLoaded = document.querySelector(`#${targetSection}`)?.classList?.contains(sectionLoadedClass);
		if(isLoaded) {
			return new Promise( resolve =>{
				resolve(true);
			})
		}
		// Make sure class is loaded
		mydoc.addClass(`#${targetSection}`, sectionLoadedClass);

		// Switch on target section to load
		switch(targetSection)
		{
			case "generalDetails":
				return new Promise ( resolve =>{
					onSetGameName();
					onSetGameDescription();
					onSetGameID();
					resolve(true);
				});

			case "questionsAnswers":
				// Load the media first. 
				await loadTabContent("gameMedia");
				var fileName = "categories.json";
				var gameID = JeopardyGame.getGameID();
				var attachmentID = JeopardyGame.getAttachmentID(fileName);
				var response = await Promises.GetTrelloCardAttachment(gameID, attachmentID, fileName);
				JeopardyGame.setCategories(response);
				onSetGameQuestions();
				onEnableTab(targetSection);
				return new Promise( resolve => { resolve(true); } );

			case "gameSettings":
				var fileName = "config.json";
				var gameID = JeopardyGame.getGameID();
				var attachmentID = JeopardyGame.getAttachmentID(fileName);
				var response = await Promises.GetTrelloCardAttachment(gameID, attachmentID, fileName);
				JeopardyGame.Config.createConfiguration(response);
				onSetGameRules();
				onEnableTab(targetSection);
				return new Promise( resolve => { resolve(true); } );

			case "gameMedia":
				onSetGameID();
				var fileName = "media.json";
				var gameID = JeopardyGame.getGameID();
				var attachmentID = JeopardyGame.getAttachmentID(fileName);
				var response = await Promises.GetTrelloCardAttachment(gameID, attachmentID, fileName);
				JeopardyGame.setMedia(response);
				onSetGameMedia();
				onEnableTab(targetSection);
				return new Promise( resolve => { resolve(true); } );

			case "testAndPlay":
				await loadTabContent("questionsAnswers");
				await loadTabContent("gameSettings");
				await loadTabContent("gameMedia");
				return new Promise( resolve => {
					resolve(true);
				});
			default:
				return new Promise( resolve =>{ resolve("Default"); });
		}
	}

	// Enable a tab
	function onEnableTab(tabIdentifier) { 
		document.querySelector(`[data-section-id="${tabIdentifier}"]`)?.classList.remove("disabled");	
	}
	
	// Toggle the tabs
	async function onSwitchTab(event)
	{
		let target = event.target;
		
		// Always clear any messages
		onSetLoadingMessage("");

		// First, get details of target section
		let targetSection = target.getAttribute("data-section-id");
		let isDisabled = target?.classList.contains("disabled");
		if(isDisabled){
			onSetDefaultSection();
			return;
		}

		let identifier = `#${targetSection}`;
		let section = document.querySelector(identifier);

		// Update the TAB selection first
		mydoc.removeClass(".selected_tab", "selected_tab");
		mydoc.addClass(".edit_section.selected_section", "hidden");
		mydoc.removeClass(".edit_section.selected_section", "selected_section");
		target.classList.add("selected_tab");

		// Toggle the loader
		onToggleLoading("show");

		// Next, load the tab section 
		await loadTabContent(targetSection);
		
		// Hide the loader
		onToggleLoading("hide");

		// Show the new section
		mydoc.addClass(identifier, "selected_section");
		mydoc.showContent(identifier);

		// Conditional action for syncing media
		var syncMedia = (targetSection == "gameMedia") ? onSyncMediaInterval("start") : onSyncMediaInterval("stop");

		// Set the current section
		CurrentSection = targetSection;

		// Update window history state to allow for easy refresh
		let newSearch = mydoc.getNewSearch({"section":targetSection});
		let newPath = location.pathname + newSearch;
		mydoc.addWindowHistory({"path":newPath}, true); //use replace to avoid confusion with Back button not changing page

		Logger.log("Switching Section to: " + targetSection);
	}

	// Toggle visibility of sections related to selected rule option
	function onToggleRuleOptionDetails(sourceEle)
	{
		// Get the selected option of the element
		let selectedOption = sourceEle.querySelector("option:checked");

		// Get key values from the selected option;
		let attr_Description = selectedOption.getAttribute("data-jpd-description");
		let attr_Suggestion = selectedOption.getAttribute("data-jpd-suggestion");
		let attr_Type = selectedOption.getAttribute("data-jpd-type");
		let attr_CustomValue = selectedOption.getAttribute("data-jpd-custom-value");

		// Show the rule description
		let ruleDescParagraph = HostUtility.getSibling(sourceEle, ".rule_description");
		if(ruleDescParagraph != undefined)
		{
			ruleDescParagraph.innerText = attr_Description;
		}

		// Decide whether to show the Host View button or not
		if(sourceEle.id == "AnsweringQuestions")
		{
			if(sourceEle.value == "2")
			{
				mydoc.removeClass(".host_view_section", "hidden")
			}
			else
			{
				mydoc.addClass(".host_view_section", "hidden")
			}
		}

		// Check if suggestion is included;
		let suggestionParagraph = HostUtility.getSibling(sourceEle, ".rule_suggestion");
		let hasSuggestion = attr_Suggestion?.length > 0 ?? false;
		if(hasSuggestion)
		{
			suggestionParagraph.classList.remove("hidden");
			suggestionParagraph.innerText = "Suggestion: " + attr_Suggestion;
		}
		else
		{
			suggestionParagraph.classList.add("hidden");
			suggestionParagraph.innerText = attr_Suggestion;
		}

		// Next, check if custom value can be input
		let customInput = HostUtility.getSibling(sourceEle, ".rule_custom");
		let allowsCustom = attr_Type?.includes("custom") ?? false;
		if(allowsCustom)
		{
			customInput.classList.remove("hidden");
			customInput.value = attr_CustomValue ?? "";
		}
		else
		{
			customInput.classList.add("hidden");
			customInput.value = "";
		}
	}

	// Listener for when the user changes an option on the settings section
	function onRuleOptionChange(event)
	{
		let sourceEle = event.srcElement;	
		let sourceID = sourceEle.id;
		let value = sourceEle.value;

		// Update the game
		JeopardyGame.Config[sourceID].option = value;

		// Toggle details
		onToggleRuleOptionDetails(sourceEle);
	}

	// Saving the option VALUE if applicable
	function onRuleValueChange(event)
	{
		let sourceEle = event.srcElement;	
		let key = sourceEle.getAttribute("data-jpd-rule-key");
		let value = sourceEle.value;
	
		// Set the value;
		JeopardyGame.Config[key].value = value;

		onChangeInSection();
	}

/***** GENERAL FORM ACTIONS: Actions that involve the forms */

	// Toggle forms;
	function onToggleForm(state, formIdentifier)
	{
		if(state == "show")
		{
			onSaveScroll(); // save the scroll position;
			onAlignForm() // Make sure top section is aligned
			mydoc.showContent(formIdentifier);
			mydoc.hideContent("#listOfCategories");
			mydoc.hideContent(".addCategoriesSection");
			mydoc.hideContent("#save_game_details");
		}
		else if (state == "hide")
		{

			mydoc.hideContent(formIdentifier);
			mydoc.showContent("#listOfCategories");
			mydoc.showContent(".addCategoriesSection");
			mydoc.showContent("#save_game_details");
			onReScroll() // go back to scroll position
		}
	}

	// Load a form HTMl
	function loadFormHTML(identifier, formValuesObject)
	{

		console.log("Load the form HTML");
		
		let formName = identifier.replace("#","");
		let templateName = `host/templates/${formName}.html`;

		// Get the media object for the question form
		let audioOptions = JeopardyGame.getMediaOptions("Audio");
		let imageOptions = JeopardyGame.getMediaOptions("Image");
		let mediaObj = {"AudioOptions":audioOptions, "ImageOptions":imageOptions}

		// The object for the form
		let formObject = (identifier == "#questionForm") ? mediaObj : {}

		// Set the form template & the form values
		MyTemplates.getTemplate(templateName, formObject,(template)=>{
			
			mydoc.setContent(identifier, {"innerHTML": template});
			
			// Run the function to set the values
			if(identifier == "#questionForm"){ onSetQuestionFormValues(formValuesObject); }
			if(identifier == "#categoryForm"){ onSetCategoryFormValues(formValuesObject); }

			// Toggle the form
			onToggleForm("show", identifier);

		});
	}

	// Aligning the top of the form to be visible when opened
	function onAlignForm()
	{
		document.getElementById("edit_game_section")?.scrollIntoView();
	}

	// Save the current scroll location
	function onSaveScroll()
	{
		WindowScroll.X = window.scrollX;
		WindowScroll.Y = window.scrollY;
	}

	// Ensure the page is scrolled back to the place it was at.
	function onReScroll()
	{
		window.scrollTo(WindowScroll.X, WindowScroll.Y);	
	}



/***** QUESTION FORM ACTIONS: Actions that involve the question form */

	// Adding a new question
	function onAddQuestion(event)
	{
		let target = event.target; 
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;

		// Set the form values;
		let category = JeopardyGame.getCategory(categoryName);
		let questionFormObj = {"Category": category, "Value":undefined};

		// Load the form
		loadFormHTML("#questionForm", questionFormObj);
		
	}

	// On edit of a question
	function onEditQuestion(event)
	{
		let target = event.target;
		let row = target.closest(".questionRow");
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;
		let value = row.querySelector(".questionValue")?.innerText;

		// Get the appropriate category + questions
		let category = JeopardyGame.getCategory(categoryName);

		// Object to use to set the form
		let questionFormObj = {"Category": category, "Value":value};
		loadFormHTML("#questionForm", questionFormObj);
	}

	// Swapping question
	function onSwapQuestionOrder(event)
	{
		let target = event.target;

		// Determine direction we are swapping
		let isUp = target.classList.contains("fa-arrow-up");
		let isDown = target.classList.contains("fa-arrow-down");

		// Get the appropriate Category
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;
		let category = JeopardyGame.getCategory(categoryName);

		// Based on category, get the current question obj
		let currentRow = target.closest(".questionRow");
		let currentValue = currentRow?.querySelector(".questionValue")?.innerText ?? "";
		let currentQuestion = category?.getQuestion(currentValue);

		// Based on category & swap direction, get sibling to swap with
		let siblingRow = (isUp) ? currentRow.previousElementSibling : (isDown) ? currentRow.nextElementSibling : undefined;
		let siblingValue = siblingRow?.querySelector(".questionValue")?.innerText ?? "";
		let siblingQuestion = category?.getQuestion(siblingValue);

		// Do the swap
		if(currentQuestion != undefined && siblingQuestion != undefined)
		{
			siblingQuestion.Value = Number(currentValue);
			currentQuestion.Value = Number(siblingValue);

			// Reload the questions after swapping
			let questions = category.getQuestions();
			let categoryID = category.CategoryID;
			MyTemplates.getTemplate("host/templates/categoryQuestionRow.html", questions, (template)=>{
				mydoc.setContent(`[data-jpd-category-section='${categoryID}'] .categorySectionBody`,{"innerHTML":template} )
			});

			// Indicate a change is needed
			onChangeInSection();
		}
	}

	// On cancel of a question.
	function onCancelQuestionForm()
	{
		// Control visibility of the sections
		onToggleForm("hide", "#questionForm");
	}  

	// Set the values of the form
	function onSetQuestionFormValues(categoryObject)
	{
		let category = categoryObject.Category;
		let value = categoryObject.Value;

		// Should always know/set the category name
		mydoc.setContent("#questionFormCategoryName",{"innerText":category.Name});

		// Attempt to get the question Object
		var questionsObj = category.getQuestion(value);

		// Set the values to be set
		let questionValue = questionsObj?.Value ?? category.getNextValue();
		let isDailyDouble = category?.isDailyDouble ?? "No";
		let questionText = questionsObj?.Question.Text ?? "";
		let questionImage = questionsObj?.Question.Image ?? "";
		let questionAudio = questionsObj?.Question.Audio ?? "";
		let questionURL = questionsObj?.Question.URL ?? "";
		let answerText = questionsObj?.Answer.Text ?? "";
		let answerImage = questionsObj?.Answer.Image ?? "";
		let answerAudio = questionsObj?.Answer.Audio ?? "";
		let answerURL = questionsObj?.Answer.URL ?? "";
			
		// Set the content:
		mydoc.setContent("#questionFormValue",{"value":questionValue});
		mydoc.setContent("#questionForm [name='isDailyDouble']",{"value":isDailyDouble});
		mydoc.setContent("#questionForm [name='questionText']",{"value":questionText});
		mydoc.setContent("#questionForm [name='questionImage']",{"value":questionImage});
		mydoc.setContent("#questionForm [name='questionAudio']",{"value":questionAudio});
		mydoc.setContent("#questionForm [name='questionURL']",{"value":questionURL});
		mydoc.setContent("#questionForm [name='answerText']",{"value":answerText});
		mydoc.setContent("#questionForm [name='answerImage']",{"value":answerImage});
		mydoc.setContent("#questionForm [name='answerAudio']",{"value":answerAudio});
		mydoc.setContent("#questionForm [name='answerURL']",{"value":answerURL});		
	}

	// Save a question
	function onSaveQuestion()
	{
		let categoryName = mydoc.getContent("#questionFormCategoryName")?.innerText ?? "";
		let questionValue = mydoc.getContent("#questionFormValue")?.value ?? "";

		// Get the value to be saved
		let isDailyDouble = mydoc.getContent("#questionForm [name='isDailyDouble']")?.value ?? "No";
		let questionText = mydoc.getContent("#questionForm [name='questionText']")?.value ?? "";
		let questionImage = mydoc.getContent("#questionForm [name='questionImage']")?.value ?? "";
		let questionAudio = mydoc.getContent("#questionForm [name='questionAudio']")?.value ?? "";;
		let questionURL = mydoc.getContent("#questionForm [name='questionURL']")?.value ?? "";
		let answerText = mydoc.getContent("#questionForm [name='answerText']")?.value ?? "";
		let answerImage = mydoc.getContent("#questionForm [name='answerImage']")?.value ?? "";
		let answerAudio = mydoc.getContent("#questionForm [name='answerAudio']")?.value ?? "";
		let answerURL = mydoc.getContent("#questionForm [name='answerURL']")?.value ?? "";
		
		// Object to be saved
		let newCategoryQuestion = {
			"Value": questionValue,
			"DailyDouble": isDailyDouble,
			"Question": { "Text": questionText, "Image": questionImage, "Audio": questionAudio, "URL": questionURL },
			"Answer": { "Text": answerText, "Image": answerImage, "Audio": answerAudio, "URL": answerURL }
		}
		
		// Update the saved category question
		let results = JeopardyGame.updateCategoryQuestion(categoryName, newCategoryQuestion);

		// Reload the question row -- so the page shows latest results
		let category = JeopardyGame.getCategory(categoryName);
		let questions = category.Questions;
		let categoryID = category.CategoryID;

		MyTemplates.getTemplate("host/templates/categoryQuestionRow.html", questions, (template)=>{
			mydoc.setContent(`[data-jpd-category-section='${categoryID}'] .categorySectionBody`,{"innerHTML":template} )
		});

		onToggleForm("hide", "#questionForm");

		// Indicate a change is needed
		onChangeInSection();
	}

	// Remove a question
	function onDeleteQuestion()
	{
		let categoryName = mydoc.getContent("#questionFormCategoryName")?.innerText ?? "";
		let questionValue = mydoc.getContent("#questionFormValue")?.value ?? "";

		// Reload the question row -- so the page shows latest results
		let category = JeopardyGame.getCategory(categoryName);

		let proceed = confirm("Are you sure you want to delete this question?")
		if(proceed)
		{
			category.deleteQuestion(questionValue);

			let questions = category.Questions;
			let categoryID = category.CategoryID;

			// Reload category section
			MyTemplates.getTemplate("host/templates/categoryQuestionRow.html", questions, (template)=>{
				mydoc.setContent(`[data-jpd-category-section='${categoryID}'] .categorySectionBody`,{"innerHTML":template} )
			});
			
			onToggleForm("hide", "#questionForm");
	
			// Indicate a change is needed
			onChangeInSection();
		}
	}


/***** CATEGORY FORM ACTIONS: Actions that involve the question form */

	// Adding a new question
	function onAddCategory(event)
	{
		let target = event.target; 
		let isFinalJeopardy = target.classList.contains("addFinalJeopardyCategory");
		let categoryObj = (isFinalJeopardy) ? {"FinalJeopardy":"Yes", "Order":99 } : {}
		loadFormHTML("#categoryForm",categoryObj);
	}

	// On cancel of adding a category
	function onCancelCategoryForm()
	{
		// Control visibility of the sections
		onToggleForm("hide", "#categoryForm");
	} 

	// On edit of a category
	function onEditCategory(event)
	{
		let target = event.target;
		let section = target.closest(".categorySection");
		let categoryName = section.querySelector(".categoryName")?.innerText;

		// Get the appropriate category + questions
		let category = JeopardyGame.getCategory(categoryName);
		loadFormHTML("#categoryForm",category);
	}
	
	// Set the pieces of a category
	function onSetCategoryFormValues(categoryObject)
	{
		// Set the values to be set
		let categoryID = categoryObject?.CategoryID ?? "";
		let categoryName = categoryObject?.Name ?? "";
		let categoryOrder = categoryObject?.Order ?? JeopardyGame.getNextCategoryOrder();
		let finalJeopardy = categoryObject?.FinalJeopardy ?? "No";

		// Set the content:
		// mydoc.addClass(".categoryFormOrderSection", categoryOrderClass);
		mydoc.setContent("#categoryForm [name='categoryFormID']",{"value":categoryID});
		mydoc.setContent("#categoryForm [name='categoryFormName']",{"value":categoryName});
		mydoc.setContent("#categoryForm [name='categoryFormOrder']",{"value":categoryOrder});
		mydoc.setContent("#categoryForm [name='categoryFormFinalJeopardy']",{"value":finalJeopardy});
	}

	// Save a category
	function onSaveCategory()
	{
		// Get the values to be saved
		let categoryID = mydoc.getContent("#categoryForm [name='categoryFormID']")?.value ?? "";
		let categoryName = mydoc.getContent("#categoryForm [name='categoryFormName']")?.value ?? "";
		let categoryOrder = mydoc.getContent("#categoryForm [name='categoryFormOrder']")?.value ?? "";
		let finalJeopardy = mydoc.getContent("#categoryForm [name='categoryFormFinalJeopardy']")?.value ?? "No";
		
		// Object to be saved
		let newCategory = {
			"ID" : categoryID,
			"Name": categoryName,
			"Order": categoryOrder,
			"FinalJeopardy": finalJeopardy,
			"ValueCount": 100
		}

		// Clear the message
		mydoc.setContent("#categoryFormMessage", {"innerHTML": ""} );

		// If this order is already in use, then show error
		let categories = JeopardyGame.getCategories();
		
		// Updat existing category
		if(categoryID != "")
		{
			// Check for any existing order
			let existingOrder = categories.filter((category)=>{ 
				return (category.Order == newCategory.Order && category.CategoryID != newCategory.ID) 
			});

			if(existingOrder.length > 0){
				mydoc.setContent("#categoryFormMessage", {"innerHTML": "This order is already being used. Please use a different one" });
				return; 
			}

			console.log(newCategory);
			// Update the category
			JeopardyGame.updateCategory(newCategory);
		}
		// Or add new category
		else if(categoryName != "")
		{
			// Check for any existing order
			let existingOrder = categories.filter((category)=>{ 
				return (category.Order == newCategory.Order) 
			});

			if(existingOrder.length > 0){
				mydoc.setContent("#categoryFormMessage", {"innerHTML": "This order is already being used. Please use a different one" });
				return; 
			}
			// Add the new category
			JeopardyGame.addCategory(newCategory);
		}		

		// Reload all categories
		onSetGameQuestions();

		// Hide the form
		onToggleForm("hide", "#categoryForm");
				
		// Indicate a change is needed
		onChangeInSection();
	}

	// Delete a category
	function onDeleteCategory()
	{
		// Get the values to be saved
		let categoryName = mydoc.getContent("#categoryForm [name='categoryFormName']")?.value ?? "";

		let proceed = confirm("Are you sure you want to delete this category?");
		if(proceed)
		{
			JeopardyGame.deleteCategory(categoryName);

			// Reload all categories
			onSetGameQuestions();

			// Hide the form
			onToggleForm("hide", "#categoryForm");
					
			// Indicate a change is needed
			onChangeInSection();
		}
	}

/*** Game Media */

	// Control the syncing of the game media
	function onSyncMediaInterval(state)
	{
		// Always stop the interval first. ;) 
		clearInterval(syncMediaInterval);

		// If starting, then setup interval
		if(state == "start")
		{
			// Run it first, then start an Interval
			onSyncMedia()
			var syncMediaInterval = setInterval( onSyncMedia, 60000);
		}
	}

	// Run the sync of the media
	function onSyncMedia()
	{
		loading_html = `
			<span>Syncing</span>
			<img class="component_saving_gif" src="https://dejai.github.io/scripts/assets/img/loading1.gif" style="width:5%;height:5%;">
			`;
		MyNotification.notify("#syncNotifier", loading_html, "notify_orange");

		let existingMedia = JeopardyGame.getListOfMedia(true);
		let existingMediaMap = {}
		existingMedia?.forEach( (media)=>{ existingMediaMap[media.ID] = media ; });

		// Get the data from the Spreadsheet  get the Spreadsheet values;
		MyGoogleDrive.getSpreadsheetData(MyGoogleDrive.uploadedMediaURL, (data) =>{
			
			spreadSheetData = MyGoogleDrive.formatSpreadsheetData(data.responseText);
			rows =  spreadSheetData["rows"];

			// Filter the rows to only the ones for this game;
			rows = MyGoogleDrive.filterRowsByColumnValue(rows,"Game ID", JeopardyGame.getGameID());

			// Flag if new media added
			let newMediaAdded = false;

			// Loop through rows to check if media is to be synced
			for(let idx=0; idx < rows.length; idx++)
			{
				row = rows[idx]; // get single row
				let newMedia = {
					"ID": MyGoogleDrive.getFileID(row["Upload File"]),
					"Name": row["File Name"],
					"Type": row["Type of File"],
					"Src": MyGoogleDrive.formatURL(row["Type of File"], row["Upload File"])
				}

				// If file does not exist, then add new
				if(!(Object.keys(existingMediaMap).includes(newMedia.ID)) )
				{
					JeopardyGame.addMedia(newMedia);
					newMediaAdded = true;
				}
			}

			// Only resync if new media added
			if(newMediaAdded)
			{
				onSetGameMedia(); //update page
				onChangeInSection() // indicate need to save
			}
			MyNotification.clear("#syncNotifier", "notify_orange");
			MyNotification.notify("#syncNotifier", "Synced", "notify_limegreen");
		});

	}

	// Delete the media
	function onDeleteMedia(mediaID)
	{
		try
		{
			let proceed = confirm("Are you sure you want to remove this media item?");
			if(proceed)
			{
				document.getElementById(mediaID).remove();
				JeopardyGame.setMediaToInactive(mediaID);
				onChangeInSection();
			}
		}
		catch(err)
		{
			console.error(err);
		}
	}

/****** TEST/PLAY Game ****************************/ 

	// Setting message for attempting to test/play game
	function onSetErrorMessages(identifier, messages)
	{
		// Build the list of errrs;
		let messageListItems ="";
		messages.forEach( (message)=> {
			messageListItems+= `<li>${message}</li>`;
		});

		console.log(messageListItems);

		// Let the message list;
		let messageList = `<ul>${messageListItems}</ul>`;
		mydoc.setContent(".gameValidationMessage", {"innerHTML": ("This game is not valid for the following reasons" + messageList) })
		
		// Set the test cookie to zero; So the game is no longer test worthy
		let gameID = JeopardyGame.getGameID();
		mydoc.setCookie(gameID+"Tested", "0", 60);
	}

	// Clear the error messages
	function onClearErrorMessages(){ mydoc.setContent(".gameValidationMessage", {"innerHTML": ""}); }

	// To test the game
	function onTestGame()
	{
		let checkGame = JeopardyGame.isValidGame();
		let gameID = JeopardyGame.getGameID();

		mydoc.setContent("#testGameLoading", {"innerHTML": LoadingGIF});
		
		console.log("Testing game");
		console.log(checkGame);

		if(!checkGame.IsValid)
		{
			mydoc.setContent("#testGameLoading", {"innerHTML":""});
			onSetErrorMessages("#testGameValidation", checkGame.Messages);
			return;
		}

		// If we get to this point, actually play the game
		let newURL = `/board/?gameid=${gameID}&gamecode=TEST&test=1`;
		window.open(newURL, "_blank");

		// Set a cookie to indicate game has been tested; Expires in 60 minutes;
		mydoc.setCookie(gameID+"Tested", "1", 60);

		// Clear the spinning
		mydoc.setContent("#testGameLoading", {"innerHTML":""});

	}
	
	// Action to play a real game
	function onPlayGame()
	{
		Logger.log("Checking if we can play this game"); 
		mydoc.setContent("#playGameLoading", {"innerHTML": LoadingGIF});
	
		let checkGame = JeopardyGame.isValidGame();
		if(!checkGame.IsValid)
		{
			mydoc.setContent("#playGameLoading", {"innerHTML":""});
			onSetErrorMessages("#playGameValidation", checkGame.Messages);
			return;
		}

		// Confirm if the game should be Played
		let confirmMessage = "This game has not been tested recently.\n\nAre you sure you want to Play it?"
		var proceed = (JeopardyGame.Tested) ? true : confirm(confirmMessage);

		// If no confirmation, exit; 
		if (!proceed)
		{
			mydoc.setContent("#playGameLoading", {"innerHTML": ""});
			return
		}

		// Create the list and appropriate Game Card
		let newGameCode =  Helper.getCode();
		MyTrello.create_list(newGameCode, (data)=>{
			
			// Get the list ID;
			let response = JSON.parse(data.responseText);
			let listID =  response["id"] ?? undefined;

			if(listID != undefined)
			{
				// Create the game card
				let newGameInstanceName = `GAME_CARD_${newGameCode} | ${JeopardyGame.getGameName()}`;
				MyTrello.create_card(listID, newGameInstanceName,(newCardData)=>{

					let newGameResp = JSON.parse(newCardData.responseText);
					let gameCardID = newGameResp["id"];

					if(gameCardID != undefined)
					{
						let gameSettings = "[" + JSON.stringify(JeopardyGame.Config) + "]";
						// Update the description with the game's settings
						MyTrello.update_card_description(gameCardID, gameSettings, (cardData)=>{

							// Finally - navigate to the new game page
							Logger.log("Create list and play a new game");
							let gameID = JeopardyGame.getGameID();

							let newURL = `/board/?gameid=${gameID}&gamecode=${newGameCode}`;
							window.open(newURL, "_blank");

							// Stop spinning
							mydoc.setContent("#playGameLoading", {"innerHTML": ""});
						});
					}
				});
			}
		});
	}

	// Hosting the game
	function onHostGame()
	{
		mydoc.setContent("#hostGameLoading", {"innerHTML": LoadingGIF});

		let checkGame = JeopardyGame.isValidGame();
		if(!checkGame.IsValid)
		{
			mydoc.setContent("#hostGameLoading", {"innerHTML":""});
			onSetErrorMessages("#hostGameValidation", checkGame.Messages);
			return;
		}

		// Confirm if the game should be Played
		let confirmMessage = "This game has not been tested recently.\n\nAre you sure you want to Host it?"
		var proceed = (JeopardyGame.Tested) ? true : confirm(confirmMessage);

		// Only proceed if confirmation
		if (proceed)
		{
			let gameID = JeopardyGame.getGameID();
			// If we get to this point, actually play the game
			let newURL = `/board/host/code.html?gameid=${gameID}`;
			window.open(newURL, "_blank");
		}

		mydoc.setContent("#hostGameLoading", {"innerHTML": ""});
	}

/****** HELPER OBJECT: Simplifing approach for hosting ****************************/ 

	const HostUtility = 
	{
		// Quickly compare two value
		isDiffValues: (a,b)=>{
			return (a.toString() != b.toString());
		},

		// Comparing two config values
		hasDifferentConfigValues: ()=>{

			var hasDifferences = false;

			let ruleOptions = document.querySelectorAll(".ruleOption");
			let keys = []
			ruleOptions.forEach( (obj)=>{

				// Get the rule as seen on the form
				let optionVal = obj.value; 
				let ruleObj = {"option": optionVal}
				let customInput = HostUtility.getSibling(obj,".rule_custom")?.value ?? "";
				if(customInput != ""){ ruleObj["value"] = customInput; }

				// Get the saved value
				let savedObj = JeopardyGame.Config.getConfiguration(obj.id)

				if(HostUtility.isDiffValues( JSON.stringify(ruleObj), JSON.stringify(savedObj) ) )
				{
					// Indicate there are differences
					hasDifferences = true;

					// Update the JeapartyGame config
					JeopardyGame.Config.setConfiguration(obj.id, ruleObj);
				}
				keys.push(ruleObj);
			});
			return hasDifferences;
		}, 

		getSibling: (sourceEle, siblingSelector)=>{
			let parent = sourceEle.parentElement;
			let sibling = parent.querySelector(`${siblingSelector}`);
			return sibling;
		}
	}