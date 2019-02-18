
/////// ARRAY COMPARISON
// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});


const MARGIN = {left: 50, right: 50};
const NODESIZE = [1, 30];

const FEATURE_REGEX = /\[(.+?)\]/g;

var trees = [];
var index = 0;
var jsonDict = null;
var hierarchy = null;
var selectedTree = null;
var selectedNodeEdit = null;
var selectedNode = null;
var editHistory = [];
var editHistoryRev = [];

const nodeColor = {
    "unchanged": "white",
    "edited":  "lightgreen",
    "selected": "lightcoral"
}

var Visualized = function (tree, separation=null) {
    let cluster = d3.cluster().nodeSize(NODESIZE);

    if (separation)
        cluster = cluster.separation(separation);

    this.root = cluster(tree);

    let x0 = Infinity;
    let x1 = -x0;
    this.root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    this.svg = d3.select("#treeDisplay").append("svg")
        .style("width", `${x1 - x0 + MARGIN.left + MARGIN.right + 20}`)
        .style("height", "100%");

    const g = this.svg.append("g")
        .attr("transform", `translate(${-x0 + MARGIN.left}, 30)`);

    this.link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(this.root.links())
        .join("path")
        .attr("d", d => `
            M${d.target.x},${d.target.y}
            L${d.source.x},${d.source.y}
        `);

    this.node = g.append("g")
        .selectAll("g")
        .data(this.root.descendants())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    this.node.on('click', function(d) {
        if (selectedNode == null) {
            selectedNode = d;
            selectedNode.data.status = "selected";
            updateHiercachy();
            // cannot attach a node if the parent candidate is:
            // 1) the node itself,  2) terminal node,  3) it is a direct child already
        } else if (d === selectedNode || !d.children || d.children.includes(selectedNode) || selectedNode.data.contains(d.data)) {
            selectedNode.data.status = "unchanged";
            selectedNode = null;
            updateHiercachy();
        } else {
            record();
            d.data.children.push(selectedNode.data);
            d.data.children.sort(function(a, b) { return maxChildId(a) - maxChildId(b); });
            selectedNode.parent.data.children = selectedNode.parent.data.children.filter(d => d !== selectedNode.data);
            selectedNode = null;
            update();
        }
    });

    let menu = [
        {
            title: "Edit category",
            action: function(elm, d, i) {
                selectedNodeEdit = d;
                d3.selectAll(".categoryEdits").remove();
                g.append("foreignObject")
                    .attr("class", "categoryEdits")
                    .attr("x", d.x)
                    .attr("y", d.y)
                    .attr("width", "205px")
                    .attr("height", "38px")
                    .html(`
                        <form onSubmit="return handleCategoryEdit()">
                            <input id="categoryEdit" type="text" value="${d.data.cat}"/>
                        </form>`);
                document.getElementById("categoryEdit").focus();
            }
        },
        {
            title: 'Duplicate node',
            action: function(elm, d, i) {
                record();
                let newNode = d.data.copy();
                d.data.children = [newNode];
                console.log(trees[index]);
                trees[index].tree.add(newNode, d.data);
                update();
            }
        },
        {
            title: 'Delete node',
            action: function(elm, d, i) {
                record();
                d.parent.data.children = d.parent.data.children.filter(node => node !== d.data);
                Array.prototype.push.apply(d.parent.data.children, d.data.children);
                update();
            }
        }
    ];

    this.node.on("contextmenu", d3.contextMenu(menu));

    this.category = this.node.append("text")
        .attr("class", "category")
        .html(d => d.data.cat.replace(FEATURE_REGEX, function(_, p1) {
            return `<tspan class="feature">${p1}</tspan>`;
        }))
        .attr("text-anchor", "middle");

    this.rect = this.node.append("rect")
        .attr("stroke", "black")
        .attr("fill", d =>  nodeColor[d.data.status])
        .attr("y", function (d) {
            return this.parentNode.getBBox().y;
        })
        .attr("x", function(d) {
            return this.parentNode.getBBox().x - 3;
        })
        .attr("width", function(d) {
            return this.parentNode.getBBox().width + 6;
        })
        .attr("height", function(d) {
            return this.parentNode.getBBox().height + 2;
        })
        .lower();

    this.category.filter(d => !d.children)
        .clone(true)
        .attr("class", "word")
        .text(d => d.data.word)
        .attr("dy", "2.4em");

}

Visualized.prototype.remove = function() {
    this.svg.remove();
    return this;
}

Visualized.prototype.computeNodeWidth = function() {
    this.node.each(function(d, i){
        d.width = this.getBBox().width + 6;
    });
    return this;
}

function handleCategoryEdit() {
    record();
    selectedNodeEdit.data.cat = document.getElementById("categoryEdit").value;
    selectedNodeEdit.data.status = "edited";
    updateHiercachy();
    return false;
}

function setTreeName() {
    var treeName = document.getElementById("treeName");
    treeName.innerHTML = `${index + 1}/${trees.length}  ${trees[index].name}`;
}

function nextTree(next) {
    if (0 > index || index >= trees.length - 1) return;
    if (next) index++;
    else index--;
    jsonDict = trees[index].tree.root;
    editHistory = [];
    editHistoryRev = [];
    setTreeName();
    update();
}

function separation(a, b) {
    return (a.width + b.width) / 2 + 5;
}

function updateHiercachy() {
    if (selectedTree != null)
        selectedTree.remove();
    hierarchy.each(node => {
        if (selectedNode && node.data.status == "selected")
            return;
        else if (node.parent && node.parent.data.id !== node.data.orig.parentId
            || node.children && !node.data.children.map(d => d.id).equals(node.data.orig.children.map(d => d.id))
            || node.data.cat != node.data.orig.cat)
            node.data.status = "edited";
        else
            node.data.status = "unchanged";
    });
    new Visualized(hierarchy).computeNodeWidth().remove();
    selectedTree = new Visualized(hierarchy, separation);
}

function maxChildId(node) {
    console.log(node);
    if (!node.children)
        return node.id;
    return Math.max.apply(null, node.children.map(maxChildId));
}

function record() {
    // console.log(trees[index].tree.copy());
    editHistory.push(trees[index].tree.copy());
}

function undo() {
    if (editHistory.length > 0) {
        editHistoryRev.push(trees[index].tree);
        trees[index].tree = editHistory.pop();
        jsonDict = trees[index].tree.root;
        update();
    }
}

function redo() {
    console.log('bb');
    if (editHistoryRev.length > 0) {
        console.log('bb');
        editHistory.push(trees[index].tree);
        trees[index].tree = editHistoryRev.pop();
        jsonDict = trees[index].tree.root;
        update();
    }
}

function update() {
    hierarchy = d3.hierarchy(jsonDict);
    updateHiercachy();
};

trees = [{ name: "WELCOME!", tree: AUTO.parse(test) }];
jsonDict = trees[index].tree.root;
setTreeName();
update();


let file = document.getElementById('file');
 
if(window.File && window.FileReader && window.FileList && window.Blob) {
    function loadAutoFile(e) {
        var fileData = e.target.files[0];
        console.log(fileData);
 
        var reader = new FileReader();

        reader.onload = function() {
            var cols = reader.result.split('\n');
            trees = [];
            index = 0;
            for (var i = 0; i < cols.length-1; i+=2) {
                var parsed = AUTO.parse(cols[i+1]);
                console.log(parsed);
                trees.push({ name: cols[i], tree: parsed });
            }
            jsonDict = trees[index].tree.root;
            setTreeName();
            update();
        }
        reader.readAsText(fileData);
    }
    file.addEventListener('change', loadAutoFile, false);
} else {
    file.style.display = 'none';
    alert("not supported browser.");
}
 

function save() {
    var data = '';
    for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        if (! tree.tree.isValid()) {
            alert(`${i + 1}th tree is not valid CCG tree.`);
            return;
        }
        data += tree.name + '\n';
        data += AUTO.stringify(tree.tree) + '\n';
    }
    var a = document.createElement('a');
    a.textContent = 'export';
    a.download = 'trees.auto';
    a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
    a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':');
    a.click();
}