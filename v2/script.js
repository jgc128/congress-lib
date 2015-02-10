Number.prototype.map = function ( in_min , in_max , out_min , out_max ) {
  return ( this - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
}

d3.json("lcc-lcsh-1950.json", function(error, graph) {

	var width = 960,
		height = 500;

	var color = d3.scale.category20();

	var force = d3.layout.force()
		.linkStrength(0.1)
		.charge(-80)
		//.linkDistance(100)
		.size([width, height]);

	var svg = d3.select("body").append("svg")
		.attr("width", width)
		.attr("height", height);

	force
		.nodes(graph.nodes)
		.links(graph.links)
		//.linkStrength(function(d) { return d.count.map(0, 40, 0, 1); })
		.linkDistance(function(d) { return d.type == 'first' ? 200 - d.count * 3 : 50; })
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
		.attr("dy", function(d){ return 5; })
		.text(function(d) { return d.code; })
	;
	
	nodeCircle.append("title")
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
			.attr("transform", function(d){return "translate("+d.x+","+d.y+")"})
		;
	});

	
});
