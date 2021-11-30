
/*********************************************************************************
	MyTrello: Custom API wrapper for Trello
**********************************************************************************/ 

const MyTrello = {

	endpoint: "https://api.trello.com/1",
	key: "78824f4a41b17e3ab87a2934fd5e9fbb",
	token: "18616dd5585620de70fae4d1b6a4463a553581ec9aa7e211aaac45ec1d2707a3",

	board_id: "5fdfd980e5fd1b0cd5218f6a",
	wager_field: "5fe16b535ffa5a62d5f64550",
	list_id: undefined,

	current_game_list_id: "",
	demo_list_id: "5fdfd980e5fd1b0cd5218f6d",
	test_list_id: "60115ebf2caf916afa9cc107",
	admin_list_id: "6007bbc9ec73367514314430",

	
	custom_field_edit_url: "601cc5e0b397f3851991919a",
	custom_field_pub_url: "601eb6d45a6cfd723772f978",
	custom_field_phrase: "601eb6e52f10e63f573f187f",
	custom_field_score:   "601eb6ed9695ad33f90f6f14",
	custom_field_wager: "601eb6fa16ebab868c557f2e",

	authorizeTrello: function(){ return true; },

/*** Helper Functions ***/
	set_current_game_list: function(listID){
		MyTrello.current_game_list_id = listID;
	},

	GetFullTrelloPath: function(path, params=undefined){

		creds = `?key=${MyTrello.key}&token=${MyTrello.token}`;
		query = (params != undefined) ? ("&" + params) : "";

		// Build full path;
		api_path = `${MyTrello.endpoint}` + path + creds + query;

		return api_path;
	},

/*** CREATE Calls ***/

	// Create attachments on a card
	create_attachment: function(cardID, fileData, successCallback){
		// let params = `name=${fileName}&mimeType=${fileType}&file=${fileData}`
		let trello_path = `${MyTrello.endpoint}/cards/${cardID}/attachments`;
		// ?key=${MyTrello.key}&token=${MyTrello.token}}&${params}`;
		myajax.AJAX({ method:"POST", path:trello_path, data:fileData, success:successCallback, failure:Logger.errorMessage});		
	},

	// Creates a new Trello Card
	create_card: function(listID, team_name, successCallback){
		let params = `name=${team_name}&idList=${listID}&pos=top`;
		let trello_path = `${MyTrello.endpoint}/cards/?key=${MyTrello.key}&token=${MyTrello.token}&${params}`
		myajax.AJAX({ method: "POST", path:trello_path, data:"", success: successCallback, failure:Logger.errorMessage});
	},

	// Creates a new Trello Card
	create_game_card: function(listID, team_name, successCallback){
		let params = `name=${team_name}&idList=${listID}&pos=top&idLabels=5fdfd98086c6bc9cc56d4db3`;
		let trello_path = `${MyTrello.endpoint}/cards/?key=${MyTrello.key}&token=${MyTrello.token}&${params}`
		myajax.AJAX({ method: "POST", path:trello_path, data:"", success: successCallback, failure:Logger.errorMessage});
	},

	// Add a comment to a card
	create_card_comment: function(card_id, comment){
		let param = `text=${comment}`;
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/actions/comments?key=${MyTrello.key}&token=${MyTrello.token}&${param}`;
		myajax.AJAX({ method: "POST", path:trello_path, data:"", failure:Logger.errorMessage});
	},

	// Create a new list
	create_list: function(listName,successCallback){
		let param = `name=${listName}`
		let trello_path = `${MyTrello.endpoint}/boards/${MyTrello.board_id}/lists?key=${MyTrello.key}&token=${MyTrello.token}&${param}`
		myajax.AJAX({ method: "POST", path:trello_path, data:"", success: successCallback, failure:Logger.errorMessage});
	},

	// Create a new checklist
	create_checklist: function(card_id,successCallback=undefined){
		let params = `name=Media&idCard=${card_id}`;
		let trello_path = MyTrello.GetFullTrelloPath(`/checklists/`, params);
		myajax.POST(trello_path, "", successCallback, Logger.errorMessage);
		// ?key=${MyTrello.key}&token=${MyTrello.token}&${params}`;
		// let trello_path = `${MyTrello.endpoint}/checklists/?key=${MyTrello.key}&token=${MyTrello.token}&${params}`;
		// myajax.AJAX({ method: "POST", data:"", path:trello_path, success:successCallback, failure:Logger.errorMessage});
	},

	// Create an individual checklist item
	create_checklist_item: function(checklist_id, itemName, successCallback=undefined){
		let params = `name=${itemName}`;
		let trello_path = MyTrello.GetFullTrelloPath(`/checklists/${checklist_id}/checkItems`, params);
		myajax.POST(trello_path, "", successCallback, Logger.errorMessage);
		// myajax.AJAX({ method: "POST", data:"", path:trello_path, success:successCallback, failure:Logger.errorMessage});
	},

	


/*** GET Calls ***/
	
	// Get list of boards;
	get_boards: function(successCallback){
		let trello_path = `${MyTrello.endpoint}/members/me/boards?key=${MyTrello.key}&token=${MyTrello.token}`
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Get Custom Fields;
	get_custom_fields: function(successCallback){
		let trello_path = `${MyTrello.endpoint}//boards/${MyTrello.board_id}/customFields?key=${MyTrello.key}&token=${MyTrello.token}`
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Get a list of Trello Cards
	get_cards: function(listID, successCallback){
		let trello_path = `${MyTrello.endpoint}/lists/${listID}/cards?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Gets a single trello card's actions
	get_card_actions: function(card_id, successCallback){
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/actions/?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Gets a single trello card's actions
	get_card_attachments: function(card_id, successCallback){
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/attachments/?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Get the checklist items from a card's checklist
	get_card_checklist_items: function(checklist_id, successCallback){
		let trello_path= MyTrello.GetFullTrelloPath(`/checklists/${checklist_id}/checkItems`);
		myajax.GET(trello_path, successCallback, Logger.errorMessage);
	},

	// Get the custom fields on a card
	get_card_custom_fields: function(card_id, successCallback){
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/customFieldItems/?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Get Labels
	get_labels: function(successCallback){
		let trello_path = `${MyTrello.endpoint}/boards/${MyTrello.board_id}/labels?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "GET", path : trello_path, success: successCallback, failure : Logger.errorMessage});
	},

	// Gets the set of Trello Lists
	get_lists: function(successCallback){
		let param="filter=open";
		let trello_path = `${MyTrello.endpoint}/boards/${MyTrello.board_id}/lists?key=${MyTrello.key}&token=${MyTrello.token}&${param}`;
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:Logger.errorMessage});
	},

	// Gets a single trello cards
	get_single_card: function(card_id, successCallback, failureCallback=undefined){
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "GET", path:trello_path, success: successCallback, failure:failureCallback});
	},


/*** UPDATE Calls ***/

	// Update a single card
	update_card: function(card_id, new_desc){
		let param = `desc=${new_desc}`;
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/?key=${MyTrello.key}&token=${MyTrello.token}&${param}`;
		myajax.AJAX({ method: "PUT", path:trello_path, failure:Logger.errorMessage});
	},

	update_card_description: function(card_id, new_desc){
		let obj = { "desc": new_desc };
		var encoded = JSON.stringify(obj);
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "PUT", path:trello_path, data:encoded, contentType:"JSON", failure:Logger.errorMessage});
	},

	update_card_name: function(card_id, new_name){
		let param = `name=${new_name}`;
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/?key=${MyTrello.key}&token=${MyTrello.token}&${param}`;
		myajax.AJAX({ method: "PUT", path:trello_path, failure:Logger.errorMessage});
	},

	update_card_custom_field: function(card_id, field_id, new_value){
		// var obj = `{ "value":{ "text":"${new_value}" } }`;
		var obj = { "value":{ "text":new_value } };
		// var encoded = encodeURIComponent(obj);
		var encoded = JSON.stringify(obj);
		let trello_path = `${MyTrello.endpoint}/cards/${card_id}/customField/${field_id}/item/?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method: "PUT", path:trello_path, data:encoded, contentType:"JSON", failure:Logger.errorMessage});
	},

	// Update list to be archived
	update_list_to_archive: function(list_id, new_name, successCallback){
		let param = `name=${new_name}&closed=true`;
		let trello_path = `${MyTrello.endpoint}/lists/${list_id}/?key=${MyTrello.key}&token=${MyTrello.token}&${param}`;
		myajax.AJAX({ method:"PUT", path:trello_path, success:successCallback, failure:Logger.errorMessage});
	},

	// Updat the state of a checklist item;
	update_checklist_item_state: function(card_id, checklist_item_id, isComplete, successCallback){
		state = (isComplete) ? "complete" : "incomplete"
		let params = `state=${state}`;
		let trello_path= MyTrello.GetFullTrelloPath(`/cards/${card_id}/checkItem/${checklist_item_id}`, params);
		myajax.PUT(trello_path, "", successCallback, Logger.errorMessage);
	},

	// Updat the value of a checklist item;
	update_checklist_item_value: function(card_id, checklist_item_id, newName, successCallback){
		let params = `name=${newName}`;
		let trello_path= MyTrello.GetFullTrelloPath(`/cards/${card_id}/checkItem/${checklist_item_id}`, params);
		myajax.PUT(trello_path, "", successCallback, Logger.errorMessage);
	},


/*** DELETE Calls ***/

	delete_attachment: function(cardID, attachmentID, successCallback){
		let trello_path = `${MyTrello.endpoint}/cards/${cardID}/attachments/${attachmentID}?key=${MyTrello.key}&token=${MyTrello.token}`;
		myajax.AJAX({ method:"DELETE", path:trello_path, success:successCallback, failure:Logger.errorMessage});		
	},

}