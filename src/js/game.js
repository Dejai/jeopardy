/************************ GLOBAL VARIABLES ****************************************/
class GamePage {
	constructor(){
		this.CurrentTab = "";
		this.TrelloCard = undefined;
		this.Rules = [];

		this.Tabs = [];
		this.IsLoggedIn = false;
		this.LoadedTabs = [];

		// Sections to be saved
		this.SectionsToSave = new Set();
	}

	// Add a section to save
	addSectionToSave(sectionID){
		this.SectionsToSave.add(sectionID);
	}
}

const MyTrello = new TrelloWrapper("jeopardy");
const MyGamePage = new GamePage();

/*********************** GETTING STARTED *****************************/

	// Once doc is ready
	MyDom.ready( async() => {
		// Set login details
		await MyAuth.onGetLoginDetails();

		// Set the login details;
		MyAuth.showLogins();

        // window.addEventListener("beforeunload", onClosePage);
		// onKeyboardKeyup();

        var gameID = MyUrls.getSearchParam("id");
        if(gameID != undefined){

            // Get the specific card
			var cardDetails = await MyTrello.GetCard(gameID);

			// If card details not defined, then return error
			if(cardDetails == undefined){
				console.error("Could not load card");
			}

			var trelloLabels = await MyTrello.GetLabels();
			MyGamePage.TrelloCard = new TrelloCard(cardDetails, trelloLabels);

			console.log(MyGamePage.TrelloCard);

			// Set the name before loading tabs (so it's clear what game it is)
			MyDom.setContent(".triviaGameName", {"innerHTML": MyGamePage.TrelloCard?.Name ?? "" });
			MyDom.setContent(".gameDescription", {"innerHTML": MyGamePage.TrelloCard?.Description ?? ""});

			// Check if logged in
			MyGamePage.IsLoggedIn = await MyAuth.isLoggedIn();

			var _tabShow = (MyGamePage.IsLoggedIn) ? MyDom.showContent(".showOnLogin") : MyDom.hideContent(".showOnLogin");
			var _tabHide = (MyGamePage.IsLoggedIn) ? MyDom.hideContent(".hideOnLogin") : MyDom.showContent(".hideOnLogin");

			// Load the appropriate tab
			var defaultTab = "generalDetails";
			var tabFromURL = MyUrls.getSearchParam("section") ?? defaultTab; 
			var tabID = (MyGamePage.IsLoggedIn) ? tabFromURL : defaultTab; 
			var tabToShow = document.querySelector(`[data-section-id="${tabID}"]`);
			onSelectTab(tabToShow);

			// Load the specific tabs
			await loadTabContent("generalDetails");
			await loadTabContent("questionsAnswers");
			await loadTabContent("gameSettings");
			await loadTabContent("gameMedia");
			await loadTabContent("testAndPublish");
			await loadTabContent("playGame");	
        }
	});

    // Listener for keyboard event = keyup
	function onKeyboardKeyup() {
		document.addEventListener("keyup", function(event)
		{
			switch(event.code)
			{
				case "Escape":
					// onCloseQuestion();
					break;
				default:
					return;
			}
		});
	}

/******** GETTING STARTED: Loading the Adventures & Labels; Check if logged in user***************************/

	// Switch to a tab by default if it is loaded in URL
	function onSetDefaultSection()
	{
		let sectionParam = MyUrls.getSearchParam("section");
		var requestedTab = document.querySelector(`#navTabs p.tab[data-section-id='${sectionParam}']`);
		var tabToSet = (requestedTab != undefined) ? sectionParam : document.querySelector("#navTabs p.tab")?.getAttribute("data-section-id");
		document.querySelector(`#navTabs p.tab[data-section-id="${tabToSet}"]`)?.click();
	}

    // Switch tabs
    async function onSelectTab(tab) {
		if(tab == undefined) return;
       
		// Set the selected tab as selected
		MyDom.removeClass("#navTabs .tab.selected", "selected");
        tab.classList.add("selected");

        var sectionID = tab.getAttribute("data-section-id");
        document.querySelectorAll("#gameSections .edit_section")?.forEach( (section) => {
            var id = section?.id ?? "";
            var _showHide = (id == sectionID) ? section.classList.remove("hidden") : section.classList.add("hidden");
        });

		// Load the tab content
		// await loadTabContent(sectionID);

		// Conditional action for syncing media
		// var syncMedia = (sectionID == "gameMedia") ? onSyncMediaInterval("start") : onSyncMediaInterval("stop");

		// Set the URL, for easy refresh
		MyUrls.modifySearch({"section":sectionID});

		// Show the selected content
		MyDom.showContent(`[data-section-id="${sectionID}"]`);
    }

	// Function to manage loading content of a tab
	async function loadTabContent(targetSection, goToTab=false)
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
		MyDom.addClass(`#${targetSection}`, sectionLoadedClass);

		// Switch on target section to load
		switch(targetSection)
		{
			case "generalDetails":
				return new Promise ( resolve => {
					var fileName = (MyGamePage.IsLoggedIn) ? "Edit" : "Overview";
					var templatePath = `src/templates/game/generalDetails/_section${fileName}.html`;
					MyTemplates.getTemplate(templatePath, MyGamePage.TrelloCard, (template) => {
						MyDom.setContent("#generalDetails", {"innerHTML": template});
						resolve(true);
					});
				});	
			case "questionsAnswers":
				// Load the media first. 
				await loadTabContent("gameMedia");
				var content = await getAttachmentContent("categories.json");
				onLoadCategories(content);
				break;
			case "gameSettings":
				var content = await getAttachmentContent("config.json");
				onLoadGameSettings(content);
				break;
			case "gameMedia":
				var content = await getAttachmentContent("media.json");
				onLoadGameMedia(content);
				break;
			case "testAndPublish":
				await loadTabContent("questionsAnswers");
				await loadTabContent("gameSettings");
				await loadTabContent("gameMedia");
				return new Promise(resolve => {
					MyTemplates.getTemplate("src/templates/game/testAndPublish/_section.html", {}, (template) =>{
						MyDom.setContent("#testAndPublish", {"innerHTML":template});
						resolve(true);
					});
				});
			case "playGame":
				await loadTabContent("questionsAnswers");
				await loadTabContent("gameSettings");
				await loadTabContent("gameMedia");
				return new Promise(resolve => {
					MyTemplates.getTemplate("src/templates/game/playGame/_section.html", {}, (template) =>{
						MyDom.setContent("#playGame", {"innerHTML":template});
						resolve(true);
					});
				});
			default:
				return new Promise( resolve =>{ resolve("Default"); });
		}
	}

	// Get attachment content
	async function getAttachmentContent(fileName){
		var cardID = MyGamePage.TrelloCard?.CardID;
		var attachment = MyGamePage.TrelloCard?.getAttachment(fileName) ?? undefined;
		var attachmentID = attachment?.AttachmentID ?? "";
		var attachmentContent = "";
		if(attachmentID != ""){
			attachmentContent = await MyTrello.GetCardAttachment(cardID, attachmentID, fileName) ?? [];
			if(attachment != undefined && attachmentContent != undefined){
				attachmentContent = JSON.parse(attachmentContent);
				attachment.setContent(attachmentContent);
			}
		}
		return attachmentContent;
	}

/******** LOADERS: Load the things based on the section  ******************************/

	// Load the game categories/questions
	async function onLoadCategories(content)
	{
		// The categories
		var theCategories = content?.map(x => new Category(x)) ?? [];

		// Loop through each category & build HTML templates;
		var categoryBlocksHtml = "";
		for(var idx in theCategories)
		{
			var category = theCategories[idx]; 
			var questions = category.Questions;

			var questionRowsHtml = await new Promise( resolve => {
				MyTemplates.getTemplate("src/templates/game/questionsAnswers/questionRow.html", questions, (template) => {
					resolve(template);
				});
			});

			let categoryLabel = (category.isFinalJeopardy()) ? "Final Jeopardy!" : "Category";
			var categorySectionObj = {
				"categoryLabel": categoryLabel,
				"categoryName" : category.Name,
				"categorySectionBody": questionRowsHtml,
				"categoryID" : category.CategoryID 
			};

			var categoryHTML = await new Promise( resolve =>{
				MyTemplates.getTemplate("src/templates/game/questionsAnswers/categoryBlock.html", categorySectionObj, (template)=>{
					resolve(template);
				});
			});
			categoryBlocksHtml += categoryHTML;
		}

		// Set the section
		MyTemplates.getTemplate("src/templates/game/questionsAnswers/_section.html", {"ListOfCategoryBlocks": categoryBlocksHtml}, (template)=>{
			MyDom.setContent("#questionsAnswers", {"innerHTML": template});
		});

	}

	// Set the game Config/Rules
	async function onLoadGameSettings(gameConfig)
	{

		console.log(gameConfig);
		var ruleConfig = await MyFetch.call("GET", "src/config/rules.json");
		MyGamePage.Rules = ruleConfig.map(rc => new Rule(rc, gameConfig));

		// From the config from the game, set the rule config options
		// Object.keys(gameConfig)?.forEach( (key) =>{
		// 	var conf = gameConfig[key];
		// 	var option = conf?.option ?? "";
		// 	var value = conf?.value ?? undefined;
		// 	var ruleConf = rules.filter(x => x.RuleKey == key)?.[0];
		// 	if(ruleConf != undefined){
		// 		ruleConf.setOption(option, value);
		// 	}
		// });

		// Get formatted options 
		for(var idx in MyGamePage.Rules)
		{
			var rule = MyGamePage.Rules[idx];
			rule.FormattedOptions = await new Promise (resolve => {
				MyTemplates.getTemplate("src/templates/game/gameSettings/ruleOption.html", rule.Options, (template) =>{
					resolve(template);
				});
			});
		}

		var rulesRows = await new Promise(resolve => {
			MyTemplates.getTemplate("src/templates/game/gameSettings/ruleRow.html", MyGamePage.Rules, (template) =>{
				resolve(template);
			});
		});

		// Set the content
		MyTemplates.getTemplate("src/templates/game/gameSettings/_section.html", {"RuleRows":rulesRows}, (template) =>{
			MyDom.setContent("#gameSettings", {"innerHTML": template});
		});

		// document.querySelectorAll(".ruleOption")?.forEach( (ruleOpt)=>{
		// 	onToggleRuleOptionDetails(ruleOpt);
		// });
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
	
	// Set the game media
	async function onLoadGameMedia(content)
	{
		var mediaHTML = "";
		if(content?.map != undefined){
			var mediaFiles = content.map(x => new Media(x)) ?? [];
			mediaHTML = await new Promise( resolve => {
				MyTemplates.getTemplate("src/templates/game/gameMedia/mediaItem.html", mediaFiles, (template)=>{
					resolve(template);
				});	
			});
		}
		MyTemplates.getTemplate("src/templates/game/gameMedia/_section.html", {"GameMedia": mediaHTML}, (template)=>{
			MyDom.setContent("#gameMedia", {"innerHTML":template});
		});	
		// Load the game-specific form URL
		// let formURL = MyGoogleDrive.getFormURL(MyGamePage.TrelloCard.CardID);
		// MyDom.setContent("#gameFormURL", {"href": formURL});
		// let aHref =	document.getElementById("gameFormURL");
		// if (aHref != undefined){ aHref.href = formURL; }

		// // Get the list of media files
	}

	// Syncing the Game Media (temporary -- I should go back to Trello)
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

/******** CHANGES: Capturing changes on the config ******************************/

	function onChangeGameSetting(select)
	{
		var ruleID = select.getAttribute("id");
		var newOption = select.value ?? "";
		var rule = MyGamePage.Rules.filter(x => x.RuleKey == ruleID)?.[0] ?? undefined;
		if(rule != undefined){
			var newConfig = {};
			newConfig[ruleID] = {"option": newOption };
			rule.setCurrentOption(newConfig);
			MyDom.setContent(`#${ruleID}Description`, {"innerHTML": rule.RuleDescription});
			MyDom.setContent(`#${ruleID}Suggestion`, {"innerHTML": rule.RuleSuggestion});
			MyDom.setContent(`#${ruleID}CustomValue`, {"value": rule.RuleCustomValue});
			var _cust = (rule.RuleCustomValueShow) ? MyDom.replaceClass(`#${ruleID}CustomValue`, "false", "true") : MyDom.replaceClass(`#${ruleID}CustomValue`, "true", "false");
		}
		onDataChange(select);
	}

	// On data change to be saved
	function onDataChange(element){
		let closestSectionID = element.closest("div.edit_section")?.id ?? "";
		if(closestSectionID != ""){
			MyGamePage.addSectionToSave(closestSectionID);
			MyDom.showContent("#saveButton");
		}
	}


/******** SAVING: Saving changes to the game  ******************************/


	// The general save -- keeps track of diffs & saves accordingly
	async function onSaveGame()
	{
		// Switch what to save based on the section
		var sectionsToSave = Array.from(MyGamePage.SectionsToSave);

		MyDom.setContent("#saveButton", {"innerHTML":"SAVING ... "});
		MyDom.removeClass("#saveButton", "dlf_button_limegreen");
		MyDom.addClass("#saveButton", "dlf_button_gray");

		for(var idx in sectionsToSave)
		{
			var section = sectionsToSave[idx];
			
			switch(section)
			{
				case "generalDetails":
					// Update the name and description
					MyGamePage.TrelloCard.setName( MyDom.getContent("#game_name_value")?.value );
					MyGamePage.TrelloCard.setDescription( MyDom.getContent("#gameDescription")?.value );

					// Make the update calls
					await MyTrello.UpdateCardName(MyGamePage.TrelloCard.CardID, MyGamePage.TrelloCard.Name);
					await MyTrello.UpdateCardDescription(MyGamePage.TrelloCard.CardID, MyGamePage.TrelloCard.Description);
					break;
				case "gameSettings":
					let configToSave = {};
					MyGamePage.Rules.forEach( (rule) => {
						let key = rule.RuleKey;
						let opt = rule.Options.filter(x => x.IsSelected)?.[0];
						let optID = opt?.OptionID ?? "1";
						configToSave[key] = { "option": `${optID}`}
						let optVal = opt?.CustomValue ?? "";
						if(optVal != ""){
							configToSave[key]["value"] = optVal;
						}
					});
					console.log(configToSave);
					await onSaveGameFile(configToSave, "config.json");
					break;
				default:
					MyLogger.LogError("Could not save section = " + section);
					break;
			}
			// Remove the section from to be removed
			MyGamePage.SectionsToSave.delete(section);
		}

		// Reset  button;
		setTimeout(()=>{
			MyDom.removeClass("#saveButton", "dlf_button_gray");
			MyDom.addClass("#saveButton", "dlf_button_limegreen");
			MyDom.setContent("#saveButton", {"innerHTML":"SAVED"});

			// Final phase
			setTimeout(()=> {
				MyDom.setContent("#saveButton", {"innerHTML":"SAVE CHANGES"});
				MyDom.hideContent("#saveButton");
			}, 1500);

		}, 1500);
	}

	// Save one of the config files (config, category, media, etc?)
	async function onSaveGameFile(jsonObj, fileName)
	{
		try {
			var currentAttachment = MyGamePage.TrelloCard.getAttachment(fileName);
			var newFileResults = await MyTrello.CreateCardAttachment(MyGamePage.TrelloCard.CardID, "config.json", JSON.stringify(jsonObj));
			if(newFileResults != undefined){
		
				MyGamePage.TrelloCard.addAttachment(newFileResults);
				
				if(currentAttachment != undefined){
					var removeOldFileResults = await MyTrello.DeleteCardAttachment(MyGamePage.TrelloCard.CardID, currentAttachment.AttachmentID);
					MyLogger.LogInfo(`Removed file: ${currentAttachment.AttachmentID} ; ` + removeOldFileResults);
				}
			}
		} catch(err){
			MyLogger.LogError(err);
		}
	}
