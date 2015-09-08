/*
Created by Adit Trivedi 03/09/15
This script pulls ~1000 companies off a mattermark csv and find the valid email addresses for each worker
*/
var fs = require('fs');
var csv = require('fast-csv');
var request = require('request');
var rp = require('request-promise');
var elasticsearch = require('elasticsearch');

//main method to start from (called from the bottom of script)
function main(){
	setUpElasticSearch();
}

//sets up elastic search server
function setUpElasticSearch(){
  var client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'error',
    requestTimeout: 90000
  });
  extractProspectsCsv(client);
}

//Exracts prospects from Hubble Shared Office Prospects.csv
function extractProspectsCsv(client){
	var company = {};
	var prospects =[];
	var stream = fs.createReadStream('Hubble Shared Office Prospects.csv');
	var csvStream = csv()
		.on("data", function(data){
			company.name = reconstructString(data[0]);
			company.website = data[2];
			prospects.push(JSON.stringify(company));
		})
		.on("end",function(){
			console.log("Extracted data from Prospects CSV");
			console.log("Prospects length: ", prospects.length);
			lookUpCompanyWorkers(prospects, client);
		});
	stream.pipe(csvStream);
}

// Look up organisation from the elastic search server
// If organisation is found then save all workers
function lookUpCompanyWorkers(prospects, client){
	console.log("lookUpCompanyWorkers method reached");
	var company = [];
	for(var i =1; i< prospects.length; i++){
		(function(i) {
			var prospect = JSON.parse(prospects[i]);
			// console.log(prospect.name);
			client.search({
				index: 'crunchbase',
				type: 'people',
				body: {
					query: {
						match: {
							organisation: JSON.stringify(prospect.name)
						}
					}
				}
			}).then(function(resp) {
				var companyDetails = {};
				var hits = resp.hits.hits;
				prospect = JSON.parse(prospects[i])
				companyDetails.name = prospect.name;
				companyDetails.website = prospect.website;
				companyDetails.workers = hits;
				company.push(companyDetails);
				if(company.length === prospects.length-1){
					saveWorkers(company);
				}
			}, function(err){
				console.trace(err.message);
			});
		})(i);
	}
}

//save all company and worker details
function saveWorkers(companies){
	console.log("saveWorkers method reached");
	var companyArray = [];
	for(var x = 0; x<companies.length; x++){
		var company = {
			name: companies[x].name,
			website: companies[x].website
		}
		var workers = [];
		if(companies[x].workers.length>0){
			for(var y =0; y< companies[x].workers.length; y++){
				var worker = {
					firstName: companies[x].workers[y]._source.name.replace(/ /g,''),
					surname: companies[x].workers[y]._source.surname.replace(/ /g,''),
					position: companies[x].workers[y]._source.position
				};
				fs.appendFile('hostDetails.csv', '\n' + company.name + ';' + company.website + ';' + worker.firstName
					+ ';' + worker.surname + ';' + worker.position);
			}
		} 
	}
}

//reconstruct string for a particular company name
function reconstructString(name){
	// if string contains a full stop or other conditions then split
		// else return string
	if(name.indexOf(".") > -1){
		var splitter = name.split(".")
		return splitter[0];
	} else if (name.indexOf("Lt")){
		var splitter = name.split("Ltd")
		return splitter[0];
	} else if (name.indexOf("lt")){
		var splitter = name.split("lt")
		return splitter[0];
	} else if (name.indexOf("lim")){
		var splitter = name.split("lim")
		return splitter[0];
	} else if (name.indexOf("Lim")) {
		var splitter = name.split("Lim")
		return splitter[0];
	} else{
		return name;
	}
}

main();