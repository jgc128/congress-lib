var svg, surface;
var options;

var data = {};

var width, height;

var yaw=0.5, pitch=0.5, width=700, height=400, drag=false;

var tooltip;

var animationInterval;

// var colorScale = d3.scale.pow().exponent(0.1).domain([0,1000]).range([200,100]);//d3.scale.linear().domain([0,100]).range([100,0]);
var colorScale = d3.scale.category20();

d3.select(window)
.on("load", function(){

	options = {
		'year': parseInt(d3.select("#year").property("value")),
		'zoom': parseFloat(d3.select("#zoom").property("value")),
		'cumulative': false,
	};


	// from http://bl.ocks.org/mbostock/1087001
	tooltip = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);


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

	d3.select('#year').on("change", function(){ 
		stopAnimation();      
		updateYear(parseInt(this.value)) 
	});
	d3.select('#zoom').on("change", function () { updateZoom(parseFloat(this.value)) });
	d3.select('#cumulative').on("change", function () { updateCumulative(this.checked) });


	d3.select("#reset-camera-position").on("click", function(){ 
		setCameraPosition(0.5, 0.5); 
		updateZoom(1);
		d3.select('#zoom').property("value", 1) 
	});
	d3.select("#turn-camera-left").on("click", function(){ setCameraPosition(yaw + 0.1, pitch) });
	d3.select("#turn-camera-right").on("click", function(){ setCameraPosition(yaw - 0.1, pitch) });

	d3.select("#play").on("click", function(){ 
		if(!animationInterval) {
			startAnimation();
		} else {
			stopAnimation();
		}
	});


	resizeGraphArea();
	updateYear(options.year);
	updateZoom(options.zoom);
	updateCumulative(options.cumulative);

	setProgress('Loading data...');

	queue()
		.defer(d3.json, "../data/lcc-titles-nested.json")
		.defer(d3.csv, "../data/congress-lib-lcc-year.csv")
		.awaitAll(dataLoaded);
})
.on("resize", resizeGraphArea);




function dataLoaded(error, loadedData) {

	data.lccCatNames = loadedData[0];
	data.lccData = loadedData[1]; // [{lcc: "RX671", year: "1899"}, ...]

	data.excludedCats = ['I', 'O', 'W', 'X', 'Y'];

	// transform & filter data
	setTimeout(function(){
		transformData();
		setTimeout(function(){
			filterData();

				// set possible categories
				setTimeout(function(){
					setPossiblesCats();
					createLegends();

					// get cats count
					setTimeout(function(){
						createStructuredData();

						setTimeout(function(){
							computeSurface();
							computeCumulativeSurface();

							// hide loading indicator and show controls
							d3.selectAll(".loading").remove();
							d3.selectAll(".box").style("display","block").transition().duration(1000).style("opacity",1.0);

							plotSurface(options.year);

						}, 10);
						setProgress('Creating surface...');
					}, 10);
					setProgress('Grouping data...');                    
			}, 10);
			setProgress('Calculating categories...');
		}, 10);
		setProgress('Filtering data...');
	}, 10);
	setProgress('Transforming data...');
}

function transformData() {
	data.transformedData = data.lccData.map(function (lcc_record) {
		var lcc = lcc_record.lcc[0].toUpperCase();
		if (lcc_record.lcc.length < 2 || !isNaN(parseInt(lcc_record.lcc[1])))
			lcc += '-';
		else
			lcc += lcc_record.lcc[1].toUpperCase();

		var year = parseInt(lcc_record.year);

		return { 'lcc': lcc, 'year': year };
	});
}
function filterData() {
	data.filteredData = data.transformedData.filter(function (lcc_record) {
		var l1 = lcc_record.lcc[0];
		var l2 = lcc_record.lcc[1];

		var l1_condition = l1 >= "A" && l1 <= "Z";
		var l2_condition = (l2 >= "A" && l2 <= "Z") || l2 == "-";
		var year_condition = lcc_record.year >= 1800 && lcc_record.year <= 1950

		var excluded_condition = data.excludedCats.indexOf(l1) == -1;

		return l1_condition && l2_condition && year_condition && excluded_condition;
	});
}
function setPossiblesCats() {
	var l1cats = d3.set();
	var l2cats = d3.set();
	data.filteredData.forEach(function (lcc_record) {
		l1cats.add(lcc_record.lcc[0]);
		l2cats.add(lcc_record.lcc[1]);
	});
	data.l1cats = l1cats.values().sort();
	data.l2cats = l1cats.values().sort();

	// for a beauty the first and the last rows
	data.l2cats.unshift(' ');
	data.l2cats.push(' ');
}
function createLegends() {
	// set legend
	var legend1Data = data.l1cats.slice(0, data.l1cats.length / 2);
	var legend2Data = data.l1cats.slice(data.l1cats.length / 2);
	createLegend(d3.select("#legend-1"), legend1Data);
	createLegend(d3.select("#legend-2"), legend2Data);
}
function createLegend(item, legendData) {
	var legendItem = item
		.append('ul')
		.selectAll('li')
		.data(legendData)
		.enter()
		.append('li')
	;
	legendItem
		.append('div')
		.style('background-color', function (d) { return colorScale(d) })
	;
	legendItem
		.append('span')
		.text(function (d) { return getLccTitle(d, true) })
	;
}
function createStructuredData() {
	data.lccStructuredData = d3.nest()
		.key(function (d) { return d.year })
		.key(function (d) { return d.lcc[0] })
		.key(function (d) { return d.lcc[1] })
		.rollup(function (leaves) { return leaves.length })
		.map(data.filteredData, d3.map);

}
function computeSurface()
{
	var result = {};

	data.lccStructuredData.forEach(function(year, lccData) {
		var groups = [];

		var i = 0;
		var l1_idx = 0, l2_idx = 0;

		for (var l1_idx = 0; l1_idx < data.l1cats.length; l1_idx++) {
			var l1 = data.l1cats[l1_idx];

			groups.push([])
			groups.push([])

			for (var l2_idx = 0; l2_idx < data.l2cats.length; l2_idx++) {
				var l2 = data.l2cats[l2_idx];
				var l2_next = data.l2cats[l2_idx + 1] ? data.l2cats[l2_idx + 1] : l2;

				var val;
				var next_val;
				if(data.lccStructuredData.get(year).get(l1))
				{
					val = data.lccStructuredData.get(year).get(l1).get(l2);
					next_val = data.lccStructuredData.get(year).get(l1).get(l2_next);
				}
				if (!val) val = 0;
				if (!next_val) next_val = 0;
				

				groups[i].push({ 'lcc_x': l1, 'lcc_y': l2_next, 'count': 0, 'count_next': -next_val });
				groups[i + 1].push({ 'lcc_x': l1, 'lcc_y': l2_next, 'count': -val, 'count_next': -next_val });
			}

			i += 2;
		}

		// add last row (with first and last zero)
		groups.push([]);
		var l1 = groups[i - 1][0].lcc_x;
		data.l2cats.forEach(function (l2) {
			groups[i].push({ 'lcc_x': l1, 'lcc_y': l2, 'count': 0, 'count_next': 0 })
		});


		result[year] = groups;
	});


	data.surfaceData = result;
}
function computeCumulativeSurface() {
	data.surfaceDataCum = JSON.parse(JSON.stringify(data.surfaceData)); // Copy original data


	var years = data.lccStructuredData.keys().sort();

	// create cumulative data
	var i_end = data.surfaceData[years[0]].length;
	var j_end = data.surfaceData[years[0]][0].length;
	var y_end = years.length;

	// set data to zero
	for (var y = 0; y < y_end; y++)
		for (var i = 0; i < i_end; i++)
			for (var j = 0; j < j_end; j++) {
				data.surfaceDataCum[years[y]][i][j]['count'] = 0;
				data.surfaceDataCum[years[y]][i][j]['count_next'] = 0;
			}

	// set data and fina a maximum (actually, minimum :) )
	var max_count = 0;
	for (var y = 1; y < y_end; y++) {
		for (var i = 0; i < i_end; i++) {
			for (var j = 0; j < j_end; j++) {
				data.surfaceDataCum[years[y]][i][j]['count'] =
					data.surfaceDataCum[years[y - 1]][i][j]['count'] + data.surfaceData[years[y]][i][j]['count'];
				data.surfaceDataCum[years[y]][i][j]['count_next'] =
					data.surfaceDataCum[years[y - 1]][i][j]['count_next'] + data.surfaceData[years[y]][i][j]['count_next'];

				if (max_count > data.surfaceDataCum[years[y]][i][j]['count'])
					max_count = data.surfaceDataCum[years[y]][i][j]['count'];

			}
		}
	}

	// scale data
	var cumDataScale = d3.scale.linear().domain([0, max_count]).range([0, -750]);
	for (var y = 0; y < y_end; y++)
		for (var i = 0; i < i_end; i++)
			for (var j = 0; j < j_end; j++) {
				data.surfaceDataCum[years[y]][i][j]['count'] = cumDataScale(data.surfaceDataCum[years[y]][i][j]['count']);
				data.surfaceDataCum[years[y]][i][j]['count_next'] = cumDataScale(data.surfaceDataCum[years[y]][i][j]['countcount_next']);
			}
}

function plotSurface(year)
{
	var dataToPlot;
	if (options.cumulative)
		dataToPlot = [data.surfaceDataCum[year]];
	else
		dataToPlot = [data.surfaceData[year]];

	if(!surface) {
		var group = svg.append("g");

		surface = group.data(dataToPlot)
			.surface3D(width, height);
	}
	else
		surface.data(dataToPlot)
			.surface3D()
			// .transition().duration(500)
		;


	surface
		.surfaceHeight(function(d){
			return d.count;
		})
		.surfaceColor(function(d){
			return colorScale(d.lcc_x);
		})
		.surfaceMouseOver(function (d) {
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

			var text = getLccTitle(lcc);

			tooltip.text(text)
				  .style("left", (d3.event.pageX - 50) + "px")
				  .style("top", (d3.event.pageY - 70) + "px");
		})
	;
}



function resizeGraphArea() {
	width = window.innerWidth;
	height = window.innerHeight;

	svg.attr("width", width).attr("height", height);
}
function updateYear(year) {
	options.year = year;
	d3.select('#year-label').text('Year: ' + year);

	if (data.surfaceData)
		plotSurface(options.year);
}
function updateZoom(zoom) {
	options.zoom = zoom;
	d3.select('#zoom-label').text('Zoom: ' + zoom);

	if (surface)
		surface.zoom(options.zoom);
}
function updateCumulative(isCumulative) {
	options.cumulative = isCumulative;

	if (surface)
		plotSurface(options.year);

}

function getLccTitle(lcc, includeCode) {
	var str;

	if(lcc.length == 1)
		str = data.lccCatNames[lcc].title;
	else if(lcc.length == 2)
		if (data.lccCatNames[lcc[0]] && data.lccCatNames[lcc[0]]['lccs'][lcc])
			str = data.lccCatNames[lcc[0]]['lccs'][lcc].title;
		else {
			str = lcc;
			includeCode = false;
		}

	if (includeCode)
		str = lcc + ' - ' + str;

	return str;
}

function setCameraPosition(newYaw, newPitch) {
	if(surface) {
		yaw = newYaw;
		pitch = newPitch;

		surface.turntable(yaw,pitch);
	}
}

function setProgress(text) {
	d3.select("#loading-text").text(text);
}



function stopAnimation(){
	clearInterval(animationInterval);
	animationInterval = undefined;

	d3.select("#play").property("value", "Play animation");
}
function startAnimation() {
	 d3.select("#play").property("value", "Stop animation");

	animationInterval = setInterval(function(){
		options.year += 1;
		d3.select('#year').property("value", options.year);
		updateYear(options.year);
		
		if (options.year == 1950){
			stopAnimation();
		}
	}, 300);
}

