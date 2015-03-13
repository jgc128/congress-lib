//   http://stackoverflow.com/questions/14127065/d3-streamgraph-layer-fade-function


var datasets = ["../data/congress-lib-lcc-year.csv"];

var currentLcc = '';

var options;

// var width, height;
var width = 960,
    height = 500;

var padding = 50;
var leftPadding = 300;

var startYear = 1850;
var endYear = 1950;


var startChar = "A".charCodeAt(0);
var endChar = "Z".charCodeAt(0);

var n = endChar - startChar + 1; // number of layers
var m = endYear - startYear + 1; // number of samples per layer


var data = {};

d3.select(window)
.on("load", function(){
    svg = d3.select("body").append("svg");

    options = {
        'datasetIndex': 0,
    };

    // create dataset select control
    var selectControl = d3.select('#control')
        .append('select')
        .attr('class','select')
    ;

    var optionsControl = selectControl
        .selectAll('option')
        .data(datasets).enter()
        .append('option')
        .text(function (d) { return d; });

    selectControl.on('change', function(){ updateDataset(this.value); });


    resizeGraphArea();

    setProgress('Loading data...');

    // load data
    var loadQueue = queue().defer(d3.json, "../data/lcc-titles-nested.json");
    datasets.forEach(function(t) { loadQueue.defer(d3.csv, t); });
    loadQueue.awaitAll(dataLoaded);
})
.on("resize", resizeGraphArea)
;




function dataLoaded(error, loadedData) {

    data.lccCatNames = loadedData[0];
    data.datasets = loadedData.slice(1);

    // hide loading indicator and show controls
    d3.selectAll(".loading").remove();
    d3.selectAll(".box").style("display", "block").transition().duration(1000).style("opacity",1.0);
    d3.select("#logos").transition().duration(1000).style("opacity",1.0);

    transformData(data.datasets[options.datasetIndex]);

    drawGraph(data.firstLevel);
}
function resizeGraphArea() {
    width = window.innerWidth;
    height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
}

function transformData(rawData) {
    // group by category
    var catGroups = d3.nest()
        .key(function(d) { return d.lcc[0] })
        .key(function(d) { return d.year })
        .rollup(function(leaves) { return leaves.length })
        .entries(rawData)
    ;

    data.firstLevel = transformLccCountToStreamData(catGroups);


    data.secondLevel = {};
    data.firstLevel.forEach(function(catGroup) {
        var lcc = catGroup.lcc;
        var subCatData = rawData.filter(function(d) { return d.lcc[0] == lcc })

        var subCatGroups = d3.nest()
            .key(function(d) {
                if (d.lcc.length < 2 || !isNaN(parseInt(d.lcc[1]))) {
                    return d.lcc[0];
                } else {
                    return d.lcc.substr(0,2);
                }
            })
            .key(function(d) { return d.year })
            .rollup(function(leaves) { return leaves.length })
            .entries(subCatData)
        ;

        data.secondLevel[lcc] = transformLccCountToStreamData(subCatGroups);

    })
}

function transformLccCountToStreamData(lccCountData) {
    // filter data
    var transformedData =
        lccCountData
        .filter(function(d) {
            var c = 0;
            if (d.key.length > 1)
                c = d.key.charCodeAt(1);
            else
                c = d.key.charCodeAt(0);

            return c >= startChar && c <= endChar;
        })
        .filter(function(d) { // There are no I, O, W, X and Y classes
            return !(d.key == 'I' || d.key == 'O' || d.key == 'W' || d.key == 'X' || d.key == 'Y')
        })
        .map(function(e){
            return {
                'lcc': e.key,
                'values': e.values.map(function(e2) {
                    return {
                        'year': parseInt(e2.key),
                        'count': e2.values
                    }
                }).filter(function(e2) {
                    return e2.year >= startYear && e2.year <= endYear;
                }),
            };
        })
    ;

    // set missing
    transformedData.forEach(function(e) {
        if (e.values.length != endYear - startYear + 1) {

            var keys = d3.set(e.values.map(function(e2) { return e2.year }));

            for(var i = startYear; i <= endYear; i++) {
                if (!keys.has(i)) {
                    e.values.push({'year': i, 'count': 0});
                }
            }
        }
    });


    return transformedData
        .filter(function(sc) { return d3.min(sc.values, function(d) { return d.count }) > 0 && d3.max(sc.values, function(d) { return d.count }) > 0 })
    ;
}


function drawGraph(graphData) {

    svg.text('');

    var color = d3.scale.category20(); //d3.scale.linear().range(["#aad", "#556"]);

    var stack = d3.layout.stack()
        // .offset("zero")
        .offset("expand")
        .values(function(d) {
            return d.values;
        })
        .x(function(d) {
            return d.year;
        })
        .y(function(d) {
            return d.count;
        });
    ;
    var stackData = stack(graphData);

    var x = d3.scale.linear()
        .domain([startYear, endYear])
        .range([leftPadding, width - padding])
    ;
    var y = d3.scale.linear()
        .domain([0, d3.max(stackData, function(layer) { return d3.max(layer.values, function(d) { return d.y0 + d.y; }); })])
        .range([padding, height - padding])
    ;

    var area = d3.svg.area()
        .x(function(d) {
            return x(d.year);
        })
        .y0(function(d) {
            return y(d.y0);
        })
        .y1(function(d) {
            return y(d.y0 + d.y);
        })
    ;


    var streams = svg.selectAll(".stream")
        .data(stackData);

    streams.enter()
        .append("path")
        .attr('class', 'stream')
        .attr("d", function(d) { return area(d.values); })
        .style("fill", function(d) { return color(d.lcc); })
        .append("title").text(function(d) { return getLccTitle(d.lcc, true) });



    streams.on('mouseover', function(d) {
        streams.attr('class', 'stream-unselected');
        d3.select(this).attr('class', 'stream-selected');
    });

    // Set the stroke width back to normal when mouse leaves the node.
    streams.on('mouseout', function(d) {
        streams.attr('class', 'stream');
    });


    streams.on('click', function(d) {
        if(currentLcc == '') {
            currentLcc = d.lcc;
            drawGraph(data.secondLevel[d.lcc]);
        } else {
            currentLcc = '';
            drawGraph(data.firstLevel);
        }

    });


    // Axes
    var xAxis = d3.svg.axis()
        .scale(
            d3.scale.linear()
            .domain([startYear, endYear])
            .range([leftPadding, width - padding])
        )
        .tickFormat(d3.format('d'))
        // .ticks(d3.time.year, 25)
    ;
    var xAxisContainer = svg.append("g")
        .attr('class', 'axis')
        .attr("transform", "translate(0," + (height - padding) + ")")
        .call(xAxis)
    ;


    var yAxisValues = stackData.filter(function(a) { return a.values[0].y > 0.05 }).map(function(a){ return a.values[0].y0 + a.values[0].y / 2 });
    var yAxisValuesText = stackData.filter(function(a) {return a.values[0].y > 0.05 }).map(function(a) { return getLccTitle(a.lcc) });
    var yAxisValuesTextScale = d3.scale.ordinal()
        .domain(yAxisValues)
        .range(yAxisValuesText)
    ;

    var yAxis = d3.svg.axis()
    	.scale(y)
        .tickValues(yAxisValues)
        .tickFormat(function(d) { return yAxisValuesTextScale(d) })
    	.orient("left")
    ;
    var yAxisContainer = svg.append("g")
        .attr('class', 'axis')
        .attr("transform", "translate(" + leftPadding + ",0)")
        .call(yAxis)
    ;


    // set graph title
    var title = svg.append("text")
        .attr('class', 'graph-title')
        .attr('text-anchor', 'middle')
        .attr('x', leftPadding + (width - leftPadding - padding) / 2)
        .attr('y', 35)
    ;
    if(currentLcc == '') {
        title.text('Top Classes')
    } else {
        title.text(getLccTitle(currentLcc, true))
    }

}


function updateDataset(datasetName) {
    var datasetIndex = datasets.indexOf(datasetName);
    options.datasetIndex = datasetIndex;
}

function getLccTitle(lcc, includeCode) {
    var str;

    if(lcc.length == 1)
        str = data.lccCatNames[lcc].title;
    else if(lcc.length == 2)
        if (data.lccCatNames[lcc[0]]['lccs'][lcc])
            str = data.lccCatNames[lcc[0]]['lccs'][lcc].title;
        else
            str = lcc;

    if (includeCode)
        str += ' - ' + lcc;

    return str;
}

function setProgress(text) {
    d3.select("#loading-text").text(text);
}
