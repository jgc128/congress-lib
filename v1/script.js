d3.json("data.json", function(error, jsonData) {
	var tmpData = splitDataByYears(jsonData.data);
	var graph = transformData(tmpData);

	var width = 960,
		height = 500;

	var color = d3.scale.category20();

	var force = d3.layout.force()
		.charge(-60)
		.linkDistance(30)
		.size([width, height]);

	var svg = d3.select("body").append("svg")
		.attr("width", width)
		.attr("height", height);

	/*
	graph.nodes = [{'name': 'one', 'group': 1}, {'name': 'two', 'group': 1}, {'name': 'three', 'group': 2}];
	graph.links = [{'source':0, 'target': 1, 'value': 2}, {'source':1, 'target': 2, 'value': 8}, {'source':0, 'target': 2, 'value': 3}];
	*/
	
	force
		.nodes(graph.nodes)
		.links(graph.links)
		.start()
	;

	var link = svg.selectAll(".link")
		.data(graph.links)
		.enter().append("line")
		.attr("class", "link")
	//	.style("stroke-width", function(d) { return Math.sqrt(d.value); })
	;

	var node = svg.selectAll(".node")
		.data(graph.nodes)
		.enter().append("circle")
		.attr("class", "node")
		.attr("r", function(d) { return Math.sqrt(d.count); })
		.style("fill", function(d) { return color(d.code); })
		.call(force.drag)
	;

	node.append("title")
		.text(function(d) { return d.code; })
	;

	force.on("tick", function() {
		
		link
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; })
		;
		
		node
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; })
		;
	});

	
});

function splitDataByYears(flatYearsData){
	var result = {};
	
	for(var i = 0; i < flatYearsData.length; i++){
		var year = flatYearsData[i].year;
		var lcc = flatYearsData[i].lcc;
		
		if(year != 1950) 
			continue;
		
		if(!(year in result))
			result[year] = [];
		
		result[year].push(lcc);
	}
	
	return result;
}



function transformData(groupedByYearsData) {
	var data = groupedByYearsData[1950];
	
	// generate count data
	var countData = {};
	var vertexData = {};
	for(var i = 0; i < data.length; i++) {
		var lcc = data[i];
		var lcc1 = lcc[0].toUpperCase();
		var lcc2 = lcc[1].toUpperCase();
		var lcc12 = undefined;
		
		if(!(lcc1 in countData))
			countData[lcc1] = 0;
		countData[lcc1] += 1;

		if(!(lcc1 in vertexData))
			vertexData[lcc1] = {};
		
		
		if(lcc2.match(/[a-z]/i)) {
			var lcc12 = lcc1 + lcc2;

			if(!(lcc12 in countData))
				countData[lcc12] = 0;
			countData[lcc12] += 1;
			
			vertexData[lcc1][lcc12] = true;
		}
		
	}
	
	// generate graph data

	// links: {'source':0, 'target': 1}
	// nodes: {}
	var graphData = {'nodes': [], 'links': []};
	var currentIndex = 0;
	var indexDict = {};

	// add root
	indexDict['00'] = currentIndex;
	graphData.nodes[currentIndex] = {'code': '00', 'count': 999};
	currentIndex += 1;
	
	
	for(topLevelCode in vertexData) {
		if(!(topLevelCode in indexDict))
		{
			indexDict[topLevelCode] = currentIndex;
			graphData.nodes[currentIndex] = {'code': topLevelCode, 'count': countData[topLevelCode]};
			currentIndex += 1;

			graphData.links.push( {'source': indexDict['00'], 'target': indexDict[topLevelCode]} );
		}
		
		for(secondLevelCode in vertexData[topLevelCode]) {
			if(!(secondLevelCode in indexDict))
			{
				indexDict[secondLevelCode] = currentIndex;
				graphData.nodes[currentIndex] = {'code': secondLevelCode, 'count': countData[secondLevelCode]};
				currentIndex += 1;
			}
			
			graphData.links.push( {'source': indexDict[topLevelCode], 'target': indexDict[secondLevelCode]} );
		}
		
	}
	
	console.log(graphData);
	
	return  graphData;
	
}