import { Tree, AUTO, test } from "./parser"
import { VisualizedTree } from "./ccg"

interface Window {
    File: any,
    FileReader: any,
    FileList: any,
    Blob: any
}
declare var window: Window

interface NamedTree {
    name: string,
    tree: Tree
}

let index: number = 0
let trees: NamedTree[] = [{name: "WELCOME!", tree: AUTO.parse(test)}]
let visualized: VisualizedTree = new VisualizedTree(trees[0].tree)
visualized.draw()


function setTreeName(): void {
    let treeName = document.getElementById("tree-name");
    treeName!.innerHTML = `${index + 1}/${trees.length}  ${trees[index].name}`;
}

function reload(): void {
    visualized.remove()
    visualized = new VisualizedTree(trees[index].tree)
    visualized.draw()
    setTreeName()
}

function nextTree(): void {
    if (index < trees.length - 1) {
        index++
        reload()
    }
}

function prevTree(): void {
    if (0 < index) {
        index--
        reload()
    }
}
 
function loadAutoFile(e: any) {
    let fileData = e.target.files[0]
    let reader = new FileReader()

    reader.onload = function() {
        if (reader.result && typeof reader.result == 'string') {
            trees = []
            let lines = reader.result.split('\n');
            for (var i = 0; i < lines.length-1; i+=2) {
                let name = lines[i]
                let parsed = AUTO.parse(lines[i+1]);
                trees.push({
                    name: name,
                    tree: parsed
                })
            }
            reload()
        }
    }
    reader.readAsText(fileData)
}


function save(): void {
    console.log('tehs')
    let data = ''
    for (let i = 0; i < trees.length; i++) {
        const tree = trees[i]
        if (! tree.tree.valid()) {
            alert(`${i + 1}th tree is not valid CCG tree.`)
            return
        }
        data += tree.name + '\n'
        data += AUTO.stringify(tree.tree) + '\n'
    }
    console.log('tehs')
    let a = document.createElement('a')
    a.textContent = 'export'
    a.download = 'trees.auto'
    a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }))
    a.dataset.downloadurl = ['text/plain', a.download, a.href].join(':')
    a.click()
    console.log('tehs')
}

let file = document.getElementById('file')!

if (window.File && window.FileReader && window.FileList && window.Blob) {
    file.addEventListener('change', loadAutoFile, false)
} else {
    file.style.display = 'none'
    alert("not supported browser.")
}
 
document.getElementById('button-save')!.onclick = save
document.getElementById('button-prev')!.onclick = prevTree
document.getElementById('button-next')!.onclick = nextTree
document.getElementById('button-undo')!.onclick = visualized.undo
document.getElementById('button-redo')!.onclick = visualized.redo

