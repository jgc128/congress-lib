var svg, surface;
var options;

var data = {};

var width, height;

var yaw=0.5,pitch=0.5, width=700, height=400, drag=false;

var tooltip;

// var colorScale = d3.scale.pow().exponent(0.1).domain([0,1000]).range([200,100]);//d3.scale.linear().domain([0,100]).range([100,0]);
var colorScale = d3.scale.category20();

d3.select(window)
.on("load", function(){

    options = {
        'year': parseInt(d3.select("#year").property("value")),
    };


    svg = d3.select("body").append("svg");
    svg.on("mousedown",function(){
        drag=[d3.mouse(this),yaw,pitch];
    }).on("mouseup",function(){
        drag=false;
    }).on("mousemove",function(){
        if(drag){
            var mouse=d3.mouse(this);
            yaw=drag[1]-(mouse[0]-drag[0][0])/50;
            pitch=drag[2]+(mouse[1]-drag[0][1])/50;
            pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch));
            surface.turntable(yaw,pitch);
        }
    });

    // from http://bl.ocks.org/mbostock/1087001
    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.select('#year').on("change", function(){ updateYear(parseInt(this.value)) });

    resizeGraphArea();
    updateYear(options.year);

    queue()
        .defer(d3.json, "../data/lcc-titles-nested.json")
        .defer(d3.json, "../data/lcc-data.json")
        .awaitAll(dataLoaded);
})
.on("resize", resizeGraphArea);




function dataLoaded(error, loadedData) {

    data.lccCatNames = loadedData[0];
    data.lccData = loadedData[1];

	// filter data
    data.filteredData = data.lccData.filter(function (lcc) {
    	var l1 = lcc[0];
    	var l2 = lcc[1];

    	var l1_condition = l1 >= "A" && l1 <= "Z";
    	var l2_condition = (l2 >= "A" && l2 <= "Z") || l2 == "-";
    	return l1_condition && l2_condition;
    });

	// get cats count
    data.catsVal = d3.nest()
        .key(function (d) { return d[0] })
        .key(function (d) { return d[1] })
        .rollup(function (leaves) { return leaves.length })
		.map(data.filteredData, d3.map);



    data.surface = computeSurface();

    // hide loading indicator and show controls
    d3.select("#loading-indicator").remove();
    // d3.selectAll(".box").style("display","block").transition().duration(1000).style("opacity",1.0);

    plotSurface();
}
function resizeGraphArea() {
    width = window.innerWidth;
    height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
}
function updateYear(year)
{
    options.year = year;
    d3.select('#year-label').text('Year: ' + year);
}
function computeSurface()
{
	var groups = [];

	// get possible cats:
	var l1cats = d3.set(data.filteredData.map(function (d) { return d[0] })).values().sort();
	var l2cats = d3.set(data.filteredData.map(function (d) { return d[1] })).values().sort();

	var i = 0;
	var l1_idx = 0, l2_idx = 0;

	l2cats.unshift(' ');
	l2cats.push(' ');

	for (var l1_idx = 0; l1_idx < l1cats.length; l1_idx++) {
		var l1 = l1cats[l1_idx];

		groups.push([])
		groups.push([])

		for (var l2_idx = 0; l2_idx < l2cats.length; l2_idx++) {
			var l2 = l2cats[l2_idx];
			var l2_next = l2cats[l2_idx + 1] ? l2cats[l2_idx + 1] : l2;

			var val = data.catsVal.get(l1).get(l2);
			if (!val)
				val = 0;
			var next_val = data.catsVal.get(l1).get(l2_next);

			groups[i].push({ 'lcc_x': l1, 'lcc_y': l2_next, 'count': 0, 'count_next': -next_val });
			groups[i + 1].push({ 'lcc_x': l1, 'lcc_y': l2_next, 'count': -val, 'count_next': -next_val });
		}

		i += 2;
	}

	// add last row (with first and last zero)
	groups.push([]);
	var l1 = groups[i - 1][0].lcc_x;
	l2cats.forEach(function (l2) {
		groups[i].push({ 'lcc_x': l1, 'lcc_y': l2, 'count': 0, 'count_next': 0 })
	});

	return groups;

}
function plotSurface()
{
    var group = svg.append("g");

    surface = group.data([data.surface])
        .surface3D(width,height);

    surface
        .surfaceHeight(function(d){
            return d.count;
        })
        .surfaceColor(function(d){
            return colorScale(d.lcc_x);
        })
        .surfaceMouseOver(function (d) {
        	var val = d.data.count_next;

			if(val)
	            tooltip.transition()
					.duration(250)
					.style("opacity", 1);
        })
        .surfaceMouseOut(function(d) {
            tooltip.transition()
                .duration(250)
                .style("opacity", 0);
        })
        .surfaceMouseMove(function(d) {
            var lcc = d.data.lcc_x;
            if (d.data.lcc_y != '-')
                lcc  += d.data.lcc_y;

            var text = getLccTitle(lcc) + ' - ' + (-d.data.count_next);

            tooltip.text(text)
                  .style("left", (d3.event.pageX - 50) + "px")
                  .style("top", (d3.event.pageY - 70) + "px");
        })
    ;
}

function getLccTitle(lcc, includeCode) {
    var str;

    if(lcc.length == 1)
        str = data.lccCatNames[lcc].title;
    else if(lcc.length == 2)
        if (data.lccCatNames[lcc[0]] && data.lccCatNames[lcc[0]]['lccs'][lcc])
            str = data.lccCatNames[lcc[0]]['lccs'][lcc].title;
        else
            str = lcc;

    if (includeCode)
        str += ' - ' + lcc;

    return str;
}
