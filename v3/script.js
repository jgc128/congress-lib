var colorScale = d3.scale.category20();
var distanceScaleSecondLevel = d3.scale.linear().domain([0,1]).range([50,100]);
var distanceScaleTopLevel = d3.scale.linear().domain([0,100]).range([400,200]);
var linkWidthScale = d3.scale.sqrt();
var nodeRadiusScale = d3.scale.sqrt();

var forceStarted = false;

// Math.max.apply(Math,graphData[1950].links.map(function(o){return o.count;}))

var svg, force;
var options;

var data = {};

var linkElem, nodeElem;


d3.select(window)
.on("load", function(){
    svg = d3.select("body").append("svg");
    force = d3.layout.force()
    ;

    options = {
        'charge': parseInt(d3.select("#charge").property("value")),
        'strength': parseFloat(d3.select("#strength").property("value")),
        'distanceMax': parseInt(d3.select("#distance").property("value")),
        'distanceMin': 200,

        'year': parseInt(d3.select("#year").property("value")),
    };


    d3.select('#charge').on("change", function(){ updateCharge(parseInt(this.value)) });
    d3.select('#strength').on("change", function(){ updateStrength(parseFloat(this.value)) });
    d3.select('#distance').on("change", function(){ updateDistance(this.value) });
    d3.select('#year').on("change", function(){ updateYear(parseInt(this.value)) });

    resizeGraphArea();
    updateCharge(options.charge);
    updateStrength(options.strength);
    updateDistance(options.distanceMax);
    updateYear(options.year);

    queue()
        .defer(d3.json, "lcc-titles.json")
        .defer(d3.json, "lcc-lcsh-full.json")
        .awaitAll(dataLoaded);
})
.on("resize", resizeGraphArea);




function dataLoaded(error, loadedData) {

    data.lccCatNames = loadedData[0];
    data.graph = loadedData[1];


    // hide loading indicator and show controls
    d3.select("#loading-indicator").remove();
    d3.selectAll(".box").style("display","block").transition().duration(1000).style("opacity",1.0);


    var graph = data.graph[options.year];
    updateGraph(graph.nodes, graph.links);
}
function updateGraph(nodesData, linksData){

    svg.selectAll("line").remove();
    svg.selectAll("g").remove();

    linkElem = svg.selectAll("line")
        .data(linksData)
    ;


    linkElem.enter()
        .append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) { return d.count != 0 ? linkWidthScale(d.count) : 1.5; })
    ;
    linkElem.exit().remove();

    nodeElem = svg.selectAll("g")
        .data(nodesData)
    ;

    var nodeEnter = nodeElem.enter()
        .append('g')
        .attr("class", "node-g")
        .call(force.drag)
    ;

    var nodeCircle = nodeEnter.append("circle")
        .attr("class", "node")
        .attr("r", function(d) { return Math.max(nodeRadiusScale(d.count), 3); })
        .style("fill", function(d) { return colorScale(d.code[0]); })
        .append("title")
            .text(function(d) { return d.code + ': ' + data.lccCatNames[d.code]; })
    ;
    var nodeText = nodeEnter
        .filter(function(d){ return d.type == "first"; })
        .append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("dy", function(d){ return 15 + Math.sqrt(d.count); })
        .text(function(d) { return data.lccCatNames[d.code]; })
    ;
    nodeElem.exit().remove();


    nodeElem.on('mouseover', function(d) {
        linkElem.attr('class', function(l) {
            if (d === l.source || d === l.target)
                return 'link-selected';
            else
                return 'link';
        });
    });

    // Set the stroke width back to normal when mouse leaves the node.
    nodeElem.on('mouseout', function(d) {
        linkElem.attr('class', 'link');
    });

    force.on("tick", function() {

        linkElem
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; })
        ;
        nodeElem
            .attr("transform", function(d){return "translate("+d.x+","+d.y+")"})
        ;
    });


    force
        .nodes(nodesData)
        .links(linksData)
        .linkDistance(function(d) { return d.type == 'first' ? distanceScaleTopLevel(d.count) : distanceScaleSecondLevel(Math.random()); })
        .start()
    ;
    forceStarted = true;
}

function resizeGraphArea() {
    var width = window.innerWidth;
    var height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
    force.size([width, height]).resume();
}
function updateCharge(value)
{
    options.charge = value;
    d3.select('#charge-label').text('Charge: ' + options.charge);

    force.charge(options.charge);
    if(forceStarted)
        force.start()
}
function updateStrength(value)
{
    options.strength = value;
    d3.select('#strength-label').text('Strength: ' + options.strength);

    force.linkStrength(options.strength);
    if(forceStarted)
        force.start()
}
function updateDistance(value)
{
    options.distanceMax = value;
    d3.select('#distance-label').text('Distance: ' + options.distanceMax);

    distanceScaleTopLevel.range([options.distanceMax, 200]);
    if(forceStarted)
        force.start()
}

function updateYear(year)
{
    options.year = year;
    d3.select('#year-label').text('Year: ' + year);

    if(forceStarted && data.graph[year])
    {
        var graph = data.graph[year];
        updateGraph(graph.nodes, graph.links);

    }
}
