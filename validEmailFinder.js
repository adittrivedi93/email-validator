var fs = require('fs');
var csv = require('fast-csv');
var request = require('request');
var rp = require('request-promise');

function main(){
	//read first n number of lines from csv file
	//get valid emails
	//repeat for all lines in file
	var startLine = 5100;
	var endLine = 5111;
	readCSV(startLine, endLine);
}

function readCSV(startLine, endLine){
	var hostDetails = fs.readFileSync('hostDetails.csv').toString().split('\n');
	for(var i = startLine; i<endLine; i++){
		var splitString = hostDetails[i].split(';');
		//order of string: company, website, firstName, surname, position
		console.log("Email construction details: " + splitString[1] + ', '+ splitString[2] + ', ' + splitString[3] + '\n');
		var emails = emailPatterns(splitString[2], splitString[3], splitString[1]);
		checkEmail(splitString[2], splitString[3], splitString[4], emails, splitString[0], splitString[1], 0);
	}
}

function checkEmail(firstName, surname, position, emails, companyName, website, emailCounter){
	var apiUrl = "http://api.verify-email.org/api.php?";
	var apiUsername = "adit94";
	var apiPassword = "hubbleEmail123";
	if(emailCounter < emails.length){
		rp(apiUrl + 'usr=' + apiUsername + '&pwd=' + apiPassword + '&check=' + emails[emailCounter])
			.then(function(response, error){
				var parsedResponse = JSON.parse(response);

				if(JSON.stringify(parsedResponse.verify_status) === '1'){
					console.log("Valid email: " + emails[emailCounter] + " for " + companyName);
					fs.appendFile('emails.csv', '\n' + firstName + '; ' + surname + '; ' + position
						+ '; ' + emails[emailCounter] + '; ' + companyName + '; ' +website);
					return;
				} else{
					console.log("Email not found: ", emails[emailCounter]);
					emailCounter++;
					if(emailCounter === emails.length){
						console.log("Email not found for " + firstName + " " + surname + " at " +companyName);
						fs.appendFile('emails.csv', '\n' + firstName + '; ' + surname + '; ' + position
							+ '; ' + "No email available" + '; ' + companyName + '; ' +website);
						return;
					} else{
						checkEmail(firstName, surname, position, emails, companyName, website, emailCounter);
					}
				}
			})
			.catch(function (reason) {
				console.log("Error: ", reason);
				fs.appendFile('emails.csv', '\n' + firstName + '; ' + surname + '; ' + position
							+ '; ' + "Error" + '; ' + companyName + '; ' +website);
				return;
			});
	}

}

// generates 12 permutations of what an email for a particular worker could be
function emailPatterns(firstName, surname, website){
	var emails = [];
	var firstName = firstName.replace(/ /g,'');
	var surname= surname.replace(/ /g,'');
	emails.push(firstName + "@" + website);
	emails.push(surname + "@" + website);
	emails.push(firstName+surname + "@" + website);
	emails.push(firstName+ "." +surname + "@" + website);
	emails.push(firstName.charAt(0) + surname + "@" + website);
	emails.push(firstName+surname.charAt(0) + "@" + website);
	emails.push(surname+firstName + "@" + website);
	emails.push(surname+"."+firstName + "@" + website);
	emails.push(surname+firstName.charAt(0) + "@" + website);
	emails.push(surname.charAt(0)+firstName + "@" + website);
	emails.push(firstName+ "-" +surname + "@" + website);
	emails.push(surname+ "-" +firstName + "@" + website);
	return emails;
}

main();