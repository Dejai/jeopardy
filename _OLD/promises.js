/*
    Shared set of Promise-based functions
*/

const Promises = {

    // Get trello labels
    GetTrelloLabels: () => {
        return new Promise ( resolve => {
            MyTrello.get_labels( (data)=> {
                var response = JSON.parse(data.responseText);
                resolve(response);
            });
        });
    },

    // Get a card from Trello
    GetTrelloCard: (cardID) =>{
        return new Promise ( resolve => {
            MyTrello.get_single_card(cardID, (data) => {
				// If we got the game (i.e. card) .. get the details
				var response = JSON.parse(data.responseText);
                resolve(response);
			}, (data) => {
                resolve(undefined);
			});
        });
    },

    // Remove a Trello Label
    RemoveTrelloLabel: (cardID, labelID) => {
        return new Promise ( resolve => {
            MyTrello.delete_card_label(cardID, labelID, (data) =>{
                var response = JSON.parse(data.responseText);
                resolve(response);
            });
        });
    },

    // Add a Trello Label
    AddTrelloLabel: (cardID, labelID) => {
        return new Promise ( resolve => {
            MyTrello.update_card_label(cardID, labelID, (data) =>{
                var response = JSON.parse(data.responseText);
                resolve(response);
            });
        });
    },

    // Get attachment from a card
    GetTrelloCardAttachment: (cardID, attachmentID, fileName) => {
        return new Promise( resolve => {
            MyTrello.get_card_attachment(cardID, attachmentID, fileName, (data)=>{
               try { 
                var response = JSON.parse(data.responseText);
                resolve(response);
               } catch(err){ 
                console.log(err);
                resolve(undefined);
               }
            });
        });
    },

    // Get the Category HTML for Edit page
    GetCategoryEditHTML: (category) => {
		return new Promise(resolve =>{
			questions = category.Questions;
			let categoryID = category.CategoryID;

			MyTemplates.getTemplate("host/templates/categoryQuestionRow.html", questions, (template)=>{

				// Take the formatted questions & set the section
				let categorylabel = (category.isFinalJeopardy()) ? "Final Jeopardy!" : "Category";
				let sectionJSON = {
					"categoryLabel":categorylabel, 
					"categoryName":category.Name, 
					"categorySectionBody":template,
					"categoryID":categoryID
				}
				MyTemplates.getTemplate("host/templates/categorySection.html", sectionJSON, (template) =>{
					resolve(template)
				});
			});
		});
	},

    // Get the formatted Media for Edit Page
    GetMediaEditHTML: (media) => {
        return new Promise( resolve =>{
            // Get the media's HTML in order to load on page
            media["MediaHTML"] = media.getMediaHTML();

            // Get template
            MyTemplates.getTemplate("host/templates/mediaItem.html", media, (template)=>{
                resolve(template);
            });
        });
    },

    // Get the rules config for Edit Page
    GetRulesFormHTML: (ruleObj, ruleKey, savedConfig) =>{
        
        return new Promise( resolve =>{

            ruleObj["Key"] = ruleKey;

			// Update options based on saved configuration
			ruleObj.Options?.forEach((option)=>{
				option["isSelected"] = (option.id == savedConfig.option) ? "selected" : "";
				option["customValue"] = savedConfig["value"] ?? "";
			});

			MyTemplates.getTemplate("host/templates/ruleOption.html",ruleObj.Options,(template)=>{
				ruleObj["FormattedOptions"] = template;

				MyTemplates.getTemplate("host/templates/ruleRow.html",ruleObj,(template)=>{
                    resolve( template ); 
				});
			});
        });
    },

    // Get the category column for the game board
    GetCategoryColumnHTML: (category, theCategories) => {

        return new Promise( resolve => {

            // Is this the final Jeopardy category;
            let isFinalJeopardyCategory = category.isFinalJeopardy();

            // Determine the width of this category
            let width = (isFinalJeopardyCategory) ? 100 : 100 * (1 / (theCategories.length-1) );
            let dynamicWidth = `style="width:${width}%;"`;
            
            // Loop through the questions in this category; Set key
            let questions = category.Questions;

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
                    resolve(categoriesTemplate);
                });
            });
        });
    },

    // Get Rule for Board view
    GetRuleForBoard: (ruleNumber, ruleObj, savedConfig) => {

        return new Promise ( resolve => {
            // The rule object that gets displayed on the page;
            let newRuleObj = {"Number": ruleNumber, "Rule": "", "SubRules":"" }

            // Set the current rule based on saved option
            ruleObj.Options?.forEach((option)=>{
                if(option.id == savedConfig.option)
                {
                    let theValue = savedConfig?.value ?? "";
                    newRuleObj["Rule"] = option['rule'].replace("${VALUE}",theValue);
                    
                    // Set any subrules;
                    if(option["subRules"]?.length > 0)
                    {
                        let subRulesHTML = ""
                        option["subRules"].forEach( (subRule)=>{
                            subRulesHTML += `<span class="subRule">${subRule}</span><br/>`;
                        });
                        newRuleObj["SubRules"] = subRulesHTML;
                    }
                }
            });

            // Set the template for the rules
            MyTemplates.getTemplate("board/templates/ruleItem.html",newRuleObj,(template)=>{
                resolve(template);
            });
        });

    },

    // Get the archive team row
    GetArchiveGameRow: (team) => {

        return new Promise( resolve => {
            MyTemplates.getTemplate("archives/templates/archiveGameRow.html", team, (template) =>{
                resolve(template);
            });
        });
    },

    // Get the archive team row
    GetArchiveTeamRow: (team) =>{

        return new Promise( resolve => {
            MyTemplates.getTemplate("archives/templates/archiveTeamRow.html", team, (template) =>{
                resolve(template);
            });
        });
    }
}