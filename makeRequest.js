
function findFreq(arr,c) {
  const indexes = [];

  for (let index = 0; index < arr.length; index++) {
    if (arr[index] === c) {
      indexes.push(index);
    }
  }
  return indexes.length
}


function extractInfoQuery(data) {
  // Extract co-authors
  ids = [];
  names = [];
  for (let i = 0; i < data.length; i++) {
    for (let a = 0; a < data[i].authors.length; a++) {
      ids.push(data[i].authors[a].authorId)
      names.push(data[i].authors[a].name)
    }
  }

  // Find unique co-authors
  collabs = names.filter(function(item,pos){
    return names.indexOf(item) == pos;
  });

  unique_ids = ids.filter(function(item,pos){
    return ids.indexOf(item) == pos;
  });

  // Count NR of co-authorships with each author
  freqs = []
  for (var i = 0; i < collabs.length; i++) {
    c = collabs[i];
    freq = findFreq(names,c)
    freqs.push(freq)
  }

  // Extract data on author itself
  authFreq = Math.max(...freqs)
  authIdx = freqs.indexOf(authFreq)
  authName = collabs[authIdx]


  // Remove author from frequencies and names
  ccs = []
  ffq = []
  uid = []

  lim = Math.round(collabs.length/100)*2;

  if (lim >=4) {
    lim = 4;
  }

  for (var i = 0; i < collabs.length; i++) {
    if (collabs[i] != authName && freqs[i] > lim){
      ccs.push(collabs[i])
      ffq.push(freqs[i])
      uid.push(unique_ids[i])
    }
  }
  collabs = ccs;
  freqs = ffq;
  ids = uid;

  return {authName,authFreq,collabs,freqs,ids}

}


function queryAuthor(id) {

  // const author = '30170627'

  // Compose API query
  var author_id = id//document.getElementById('authorname').value
  const fields = '?fields=authors,citationCount,year,title,journal'
  var url  = 'https://api.semanticscholar.org/graph/v1/author/'+author_id+'/papers' +fields;


  var collabs;
  var ids;
  var freqs;
  var author_name
  var author_freq
  var author_hindex

  var hIndexurl = 'https://api.semanticscholar.org/graph/v1/author/'+author_id+'/?fields=hIndex'

  $.ajax(
    {async : false, url : hIndexurl, success : function(data){
      autor_hindex = data.hIndex
    }}
  );

  // API request for MAIN AUTHOR
  $.ajax(
    {async : false, url : url, success : function(data){
      data = data.data
      queried_author = extractInfoQuery(data)
      collabs = queried_author.collabs
      ids     = queried_author.ids
      freqs   = queried_author.freqs

      author_name = queried_author.authName
      author_freq = queried_author.authFreq
    }}
  );


  var collaborators = [];
  var identifiers = [];
  var frequencies = [];
  var indexes     = [];

  console.log('Checking co-authors');

  // API request for CO-AUTHORS
  for (var i = 0; i < collabs.length; i++) {
    console.log(i);

    txt = i + ' / ' + collabs.length

    // $('#counter').text(txt)

    author = ids[i]
    name = collabs[i]
    url = 'https://api.semanticscholar.org/graph/v1/author/'+author+'/papers' +fields;
    hindexurl = 'https://api.semanticscholar.org/graph/v1/author/'+author+'/?fields=hIndex';

    $.ajax(
      {async : false, url : hindexurl, success : function(data){
        indexes[i] = data.hIndex
      }}
    );


    $.ajax(
      {async : false, url : url, success : function(data){
        data = data.data
        // // console.log(data);
        queried_author = extractInfoQuery(data)
        collaborators[i] = queried_author.collabs
        identifiers[i]   = queried_author.ids
        frequencies[i]   = queried_author.freqs
      }}
    );
  }

  console.log('Finished');

  scale = 3

  // Create nodes for MAIN AUTHOR graph
  nodes = [{"id" : author_name, "value" : scale*(Math.max(...indexes)+10), 'group' : 0, 'ssID' : author_id}];
  for (var i = 0; i < collabs.length; i++) {
    nodes.push({"id" : collabs[i], "value" : scale*(indexes[i]*0.7 + freqs[i]*0.3), 'group' : 1, 'ssID' : ids[i]})
  }

  // Create links for MAIN AUTHOR graph
  links = []
  for (var i = 0; i < collabs.length; i++) {
    links.push({"source" : author_name, "target" : collabs[i], "value" : scale*freqs[i]})
  }

  // Add nodes and links for CO-AUTHORS
  for (var i = 0; i < collaborators.length; i++) {
    name = collabs[i]
    coauthors = collaborators[i]
    freqs = frequencies[i]
    idds = identifiers[i]

    // console.log('==============');
    // console.log(name);
    // console.log('--------------');

    for (var j = 0; j < coauthors.length; j++) {
      // console.log(coauthors[j]);
      if (!nodes.some((currentValue) => currentValue.id == coauthors[j])) {
        nodes.push({"id" : coauthors[j], "value" : scale*freqs[j], 'group' : i+2, 'ssID' : idds[j]})
      }
      links.push({"source" : name, "target" : coauthors[j], "value" : scale*freqs[j]})
    }

  }

  // Only keep nodes which have more than one connection
  var newnodes = []
  for (var i = 0; i < nodes.length; i++) {
    s = links.filter(function(link){return (link.source ==nodes[i].id)}).length;
    t = links.filter(function(link){return (link.target ==nodes[i].id)}).length;
    // console.log(nodes[i].id,'-----',s + t);
    if (s + t > 1) {
      newnodes.push(nodes[i])
    }
  }

  // Select all links which contain the new nodes (EITHER source OR target)
  var templinks = []
  for (var i = 0; i < newnodes.length; i++) {
    newnodes[i]
    s = links.filter(function(link){return (link.source ==newnodes[i].id)})
    t = links.filter(function(link){return (link.target ==newnodes[i].id)})
    templinks.push(s)
    templinks.push(t)
  }


  // Filter LINKS which ONLY have NEWNODES as SOURCE and TARGET
  var newlinks = []
  for (var i = 0; i < templinks.length; i++) {
    templinks[i]

    for (var j = 0; j < templinks[i].length; j++) {

      already = newlinks.some((curr) => curr == templinks[i][j])
      if (!already) {
        s = newnodes.some((curr) => curr.id == templinks[i][j].source)
        t = newnodes.some((curr) => curr.id == templinks[i][j].target)

        if (s && t) {
          newlinks.push(templinks[i][j])
        }
      }
    }
  }

  // Update NODES and LINKS
  nodes = newnodes
  links = newlinks

  console.log(nodes);


  // Create graph
  data = {nodes,links}


}


function searchAuthor() {


  var tbd = document.getElementsByTagName('ul')[0]
  try {
    tbd.remove()
  } catch (e) {
    console.log('start');
  }


  // Compose API query
  var author_id = document.getElementById('authorname').value
  author_id = author_id.replace(/ /g,'%20')
  var fields = '?query='
  var lookupurl  = 'https://api.semanticscholar.org/graph/v1/author/search'+fields+author_id;

  $.ajax(
      {async : false, url : lookupurl, success : function(data){

        var names = []
        var ids = []
        var journals = []
        data = data.data;
        for (var i = 0; i < data.length; i++) {
          names.push(data[i].name)
          ids.push(data[i].authorId)

          var author_id = data[i].authorId;
          var fields = '?fields=journal';
          var authorurl  = 'https://api.semanticscholar.org/graph/v1/author/'+author_id+'/papers' +fields;

          $.ajax({async: false, url : authorurl, success : function(jrnls){
            jrnls = jrnls.data;
            var jnames = []
            for (var j = 0; j < jrnls.length; j++) {

              try {
                  jnames.push(jrnls[j].journal.name);
                }
                catch(err) {
                  console.log(-1);
                }
            }

            // Find unique
            uniq = jnames.filter(function(item,pos){
              return jnames.indexOf(item) == pos && item != 'bioRxiv' && item != '';
            });

            // Count freq of journals
            freqs = []
            for (var k = 0; k < uniq.length; k++) {
              c = uniq[k];
              freq = findFreq(jnames,c)
              freqs.push(freq)
            }

            idx = freqs.indexOf(Math.max(...freqs))

            journals.push(uniq[idx])

          }})
        }

        var listdata = [];
        for (var i = 0; i < names.length; i++) {
          listdata.push({'name' : names[i], 'id' : ids[i], 'jrnl' : journals[i]})
        }





        makeList(listdata,'authlist')



        console.log(names);
        console.log(ids);
        console.log(journals);

      }}
    );

}


// Create an unordered LIST
function makeList(listData,parentDiv,titleName) {

    // Make the list
    listElement = document.createElement('ul')
    listElement.class = 'author_list'
    listElement.style = 'padding: 1%'

    // Set up a loop that goes through the items in listItems one at a time
    nrListItems = listData.length




  for (k = 0; k < nrListItems; ++k) {
    // create an item for each one
    listItem = document.createElement('li');
    listItem.class = 'author_item'
    listItem.innerHTML = listData[k].name+'<div style="color : rgb(0,0,0,0.5); font-size: small;"> Most published journal : ' + listData[k].jrnl+ '</div>';
    listItem.value  = listData[k].id
    listItem.onclick = function(){
      initGraph(this.value);};
    listItem.onmouseover = function(){
      var elementToChange = document.getElementsByTagName("body")[0];
      elementToChange.style.cursor = "pointer";

      // this.style.backgroundColor ='rgb(0,0,0,0.05)'
      this.style.border = '2px solid #000000'
    }
    listItem.onmouseout = function(){
      var elementToChange = document.getElementsByTagName("body")[0];
      elementToChange.style.cursor = "default";
      // this.style.backgroundColor = 'white'
      this.style.border = '0px solid #d0d0d0'
    }

    clr = 'white'

    listItem.style = 'background-color: ' + clr+ ';list-style-type: none;padding: 1%; padding-top : 5% margin 0; margin-top: 2%; text-align : center '




    // Add listItem to the listElement
    listElement.appendChild(listItem);
  }

  // Add it to the page
  par = document.getElementById(parentDiv)
  par.append(listElement)
}


function toggleSideBar() {


  if ($("body").css("grid-template-columns").split(' ').length == 3) {
    $('.header').toggle('slide')
    $("body").css("grid-template-columns",'1% 99%');
  } else {
    $("body").css("grid-template-columns",'minmax(20em,20%) 1% minmax(50em,80%)');
    $('.header').toggle('slide')
  }



}


function initGraph(id) {

  queryAuthor(id);
  drawGraph();

  d3.selectAll('.zoombutton').style('display','inline')
}



function drawGraph() {

  scale = document.getElementsByClassName("zoomvalue")[0].value

  if (scale == '') {
    scale = 1
  } else {
    scale = parseFloat(scale)
    scale = 1/scale;
  }

  chart = ForceGraph(data, {
    nodeId: d => d.id,
    nodeUrl: d => 'https://www.semanticscholar.org/author/' + d.ssID,
    nodeGroup: d => d.group,
    nodeTitle: d => d.id,
    nodeRadius: d => d.value,
    forceNode : d => -1000,
    linkStrokeWidth: l => Math.sqrt(l.value),
    width : scale*12800,
    height: scale*6400
  })
}
