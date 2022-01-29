function test_trello()
{
	let entity = document.getElementById("entity").value;
	let id = document.getElementById("entity_id").value;
	switch(entity)
	{
		case "boards":
			MyTrello.get_boards(print_data)
			break;
		case "custom-fields":
			MyTrello.get_custom_fields(print_data);
			break;
		case "lists":
			MyTrello.get_open_lists(print_data);
			break;
		case "labels":
			MyTrello.get_labels(print_data);
			break;
		case "list-create":
			MyTrello.create_list("Test Trello List", print_data);
			break;
		case "cards":
			if(id != undefined)
			{
				MyTrello.get_cards(id, print_data);
			} else
			{
				alert("Need List ID for card");
			}
			break;
		case "card":
			if(id != undefined)
			{
				MyTrello.get_single_card(id, print_data);
			} else
			{
				alert("Need Card ID");
			}
			break;
		case "card-attachments":
			if(id != undefined)
			{
				MyTrello.get_card_attachments(id, print_data);
			} else
			{
				alert("Need Card ID");
			}
			break;
		case "card-actions":
			if(id != undefined)
			{
				MyTrello.get_card_actions(id, print_data);
			} else
			{
				alert("Need Card ID");
			}
			break;
		case "card-custom--fields":
			if(id != undefined)
			{
				MyTrello.get_card_custom_fields(id, print_data);
			} else
			{
				alert("Need Card ID");
			}
			break;
		case "card-create":
			if(id != undefined)
			{
				MyTrello.create_card(id, "Trello Testing", print_data);
			} else
			{
				alert("Need List ID");
			}
			break;

		case "card-update":
			if(id != undefined)
			{
				MyTrello.update_card(id, "Newest Comment", print_data);
			} else
			{
				alert("Need List ID");
			}
			break;
		default:
			alert("Not a valid option");
	}
}

function print_data(data){
	let response = JSON.parse(data.responseText);
	console.log(data);
	console.log(response);

	document.getElementById("test_results").innerHTML = "";

	let isArray = Array.isArray(response);
	let isObject = (typeof(response) == "object")
	if (isArray)
	{
		response.forEach(function(obj){
			let format = `<p>${obj["name"]} -- ( ${obj["id"]} )</p>` ;
			document.getElementById("test_results").innerHTML += format;
		});
	}
	else if (isObject)
	{
		let format = `<p>${response["name"]} -- ( ${response["id"]} )</p>` ;
		document.getElementById("test_results").innerHTML += format;
	}	
}




function process_old_data()
{
	myajax.AJAX({
		"method":"GET",
		"path": "../../jeopardy/data/disney_jeopardy_simple.txt",
		success: function(data){

			response = data.responseText;

			lines = response.split("\n");
			curr_category = "";

			output = "";

			questions = "";
			answers   = "";


			for(var idx = 0; idx < lines.length; idx++)
			{
				line = lines[idx];
				if(line.includes("Game Name") || line.length < 1){ continue; }

				// Set curr category
				else if(line.includes("Category = ")){
					curr_category = line.replace("Category = ", "");
				}
				else
				{
					quest_split = line.split(" ~ ");
					questions += quest_split[1] + "\n";
					answers += quest_split[2] + "\n";
				}
			}
			console.log(answers);
		},
		failure: function(data){ console.log(data); }
	});
}