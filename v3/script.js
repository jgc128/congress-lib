Number.prototype.map = function ( in_min , in_max , out_min , out_max ) {
  return ( this - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
}

queue(2)
	.defer(d3.json, "lcc-titles.json")
	.defer(d3.json, "lcc-lcsh-full.json")
	.await(ready);

function ready(error, lcc_dict, graphData) {
	
	window.graphData = graphData;
	
	var width, height;

	var color = d3.scale.category20();
	var force = d3.layout.force();
	var svg = d3.select("body").append("svg");

	var options = {
		'charge': parseInt(d3.select("#charge").property("value")),
		'strength': parseFloat(d3.select("#strength").property("value")),
		'distance': parseInt(d3.select("#distance").property("value")),
	};

	/*
	var graph = graphData[parseInt(d3.select("#year").property("value"))];
	d3.select('#year-label').text('Year: ' + d3.select("#year").property("value"));
	*/
	var graph = graphData[1950];
	
	force
		.nodes(graph.nodes)
		.links(graph.links)

		.charge(options.charge)
		.linkStrength(options.strength)
		//.linkStrength(function(d) { return d.count.map(0, 40, 0, 1); })
		.linkDistance(function(d) { return d.type == 'first' ? options.distance - (d.count * 4) : Math.random().map(0,1,50,100); })
		.start()
	;

	var link = svg.selectAll(".link")
		.data(graph.links)
		.enter().append("line")
		.attr("class", "link")
		.style("stroke-width", function(d) { return d.count != 0 ? Math.sqrt(d.count) : 1.5; })
	;

	var node = svg.selectAll("g")
		.data(graph.nodes)
		.enter().append('g')
		.call(force.drag)
	;
		
	var nodeCircle = node.append("circle")
		.attr("class", "node")
		.attr("r", function(d) { return Math.sqrt(d.count); })
		.style("fill", function(d) { return color(d.code[0]); })
	;
	var nodeText = node
		.filter(function(d){ return d.type == "first"; })
		.append("text")
		.attr("class", "title")
		.attr("text-anchor", "middle")
		.attr("dy", function(d){ return 15 + Math.sqrt(d.count); })
		.text(function(d) { return lcc_dict[d.code]; })
	;
	
	nodeCircle.append("title")
		.text(function(d) { return d.code + ': ' + lcc_dict[d.code]; })
	;
	
	resize();
	updateCharge(options.charge);
	updateStrength(options.strength);
	updateDistance(options.distance);
	
	d3.select(window).on("resize", resize);	
	d3.select('#charge').on("change", function(){ updateCharge(parseInt(this.value)) });
	d3.select('#strength').on("change", function(){ updateStrength(parseFloat(this.value)) });
	d3.select('#distance').on("change", function(){ updateDistance(this.value) });
	//d3.select('#year').on("change", function(){ updateYear(parseInt(this.value)) });
	
	node.on('mouseover', function(d) {
		d3.select(this.childNodes[0]).attr('class', 'node-selected');
		link.attr('class', function(l) {
			if (d === l.source || d === l.target)
				return 'link-selected';
			else
				return 'link';
		});
	});

	// Set the stroke width back to normal when mouse leaves the node.
	node.on('mouseout', function(d) {
		d3.select(this.childNodes[0]).attr('class', 'node');
		link.attr('class', 'link');
	});	
		
	force.on("tick", function() {
		
		link
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; })
		;
		node
			.attr("transform", function(d){return "translate("+d.x+","+d.y+")"})
		;
	});


	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		
		svg.attr("width", width).attr("height", height);
		force.size([width, height]).resume();
	}	
	function updateCharge(value)
	{
		options.charge = value;
		d3.select('#charge-label').text('Charge: ' + options.charge);
		force.charge(options.charge).start()
	}
	function updateStrength(value)
	{
		options.strength = value;
		d3.select('#strength-label').text('Strength: ' + options.strength);
		force.linkStrength(options.strength).start()
	}	
	function updateDistance(value)
	{
		options.distance = value;
		d3.select('#distance-label').text('Distance: ' + options.distance);
		force.start()
	}		
	/*
	function updateYear(year)
	{
		d3.select('#year-label').text('Year: ' + year);
		
		if(graphData[year])
		{
			force
				.nodes(graphData[year].nodes)
				.links(graphData[year].links)
				.start()
		}

	}
	*/	
}
