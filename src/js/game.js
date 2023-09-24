/************************ GLOBAL VARIABLES ****************************************/
const MyTrello = new TrelloWrapper("jeopardy");
const MyGamePage = new GamePage();
// Form managers
const CategoryForm = new FormManager("categoryForm.html");
const QuestionForm = new FormManager("questionsForm.html");

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

		// Set the URL, for easy refresh
		MyUrls.modifySearch({"section":sectionID});

		// Show the selected content
		MyDom.showContent(`[data-section-id="${sectionID}"]`);
    }

	// Function to manage loading content of a tab
	async function loadTabContent(targetSection, isReload=false)
	{

		// If tab is already loaded & this is NOT a reload, then nothing to do
		if(MyGamePage.LoadedTabs.has(targetSection) && !isReload){
			return new Promise( resolve =>{
				resolve("Tab content is already loaded; Skipping");
			});
		}

		// Try loading the tab
		try {
			// Switch on target section to load
			switch(targetSection)
			{
				case "generalDetails":
					var fileName = (MyGamePage.IsLoggedIn) ? "Edit" : "Overview";
					var templatePath = `src/templates/sections/generalDetails${fileName}.html`;
					var generalDetailsTemplate = await MyTemplates.getTemplateAsync(templatePath, MyGamePage.TrelloCard);
					MyDom.setContent("#generalDetails", {"innerHTML": generalDetailsTemplate});
					break;
		
				case "questionsAnswers":
					var configAttachment = MyGamePage.TrelloCard.getAttachment("categories.json");
					var content = await configAttachment.getContent();
					var categoryBlocksHtml = "";
					if(content?.map != undefined){
						// Loop through each category & build HTML templates;
						var theCategories = content?.map(x => new Category(x)) ?? [];
						for(var idx in theCategories)
						{
							var category = theCategories[idx];
							// Get question rows template
							var questionRowsTemplate = await MyTemplates.getTemplateAsync("src/templates/rows/questionRow.html", category.Questions);
							// Setup category details
							let categoryLabel = (category.isFinalJeopardy()) ? "Final Jeopardy!" : "Category";
							var categorySectionObj = {
								"CategoryLabel": categoryLabel,
								"CategoryName" : category.Name,
								"CategorySectionBody": questionRowsTemplate,
								"CategoryID" : category.CategoryID,
								"CategoryOrder": category.Order
							};
							// Get category template
							var categoryHTML = await MyTemplates.getTemplateAsync("src/templates/blocks/categoryBlock.html", categorySectionObj);
							// Append category to the HTML string being built
							categoryBlocksHtml += categoryHTML;
						}
					}
					// Set the section with the complete HTML string
					var questionAnswersSection = await MyTemplates.getTemplateAsync("src/templates/sections/questionsAnswers.html", {"ListOfCategoryBlocks": categoryBlocksHtml});
					MyDom.setContent("#questionsAnswers", {"innerHTML": questionAnswersSection});
					break;
			
				case "gameSettings":
					var configAttachment = MyGamePage.TrelloCard.getAttachment("config.json");
					var gameConfig = await configAttachment.getContent();
					var ruleConfig = await MyFetch.call("GET", "src/config/rules.json");
					MyGamePage.Rules = ruleConfig.map(rc => new Rule(rc, gameConfig));
					// Get formatted options 
					for(var idx in MyGamePage.Rules)
					{
						var rule = MyGamePage.Rules[idx];
						rule.FormattedOptions = await MyTemplates.getTemplateAsync("src/templates/rows/ruleOption.html", rule.Options);
					}

					// Get a unique row for each category;
					var rulesRows = await MyTemplates.getTemplateAsync("src/templates/blocks/ruleBlock.html", MyGamePage.Rules);

					// Set the content
					var gameSettingsSection = await MyTemplates.getTemplateAsync("src/templates/sections/gameSettings.html", {"RuleRows":rulesRows})
					MyDom.setContent("#gameSettings", {"innerHTML": gameSettingsSection});
					break;

				case "gameMedia":
					// Get all media that is not a JSON file
					var mediaAttachments = Object.values(MyGamePage.TrelloCard.Attachments).filter(x => x.MimeType != "application/json");
					// Make sure all attachments have content;
					for(var idx in mediaAttachments){
						var attachment = mediaAttachments[idx];
						await attachment.getContent();
					}
					var mediaHTML = await MyTemplates.getTemplateAsync("src/templates/blocks/mediaItemBlock.html", mediaAttachments);
					var mediaSectionHTML = await MyTemplates.getTemplateAsync("src/templates/sections/gameMedia.html", {"GameMedia": mediaHTML});
					MyDom.setContent("#gameMedia", {"innerHTML":mediaSectionHTML});
					break;

				case "testAndPublish":
					await loadTabContent("questionsAnswers");
					await loadTabContent("gameSettings");
					var testAndPublishHTML = await MyTemplates.getTemplateAsync("src/templates/sections/testAndPublish.html", {});
					MyDom.setContent("#testAndPublish", {"innerHTML":testAndPublishHTML});
					break;

				case "playGame":
					await loadTabContent("questionsAnswers");
					await loadTabContent("gameSettings");
					var playSectionHTML = await MyTemplates.getTemplateAsync("src/templates/sections/playGame.html", {});
					MyDom.setContent("#playGame", {"innerHTML":playSectionHTML});
					break;

				default:
					return new Promise( resolve =>{ resolve("Default"); });
			}
			// Make sure tab is marked as loaded is loaded
			MyGamePage.LoadedTabs.add(targetSection);

		} catch(err){
			MyLogger.LogError(err)
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
