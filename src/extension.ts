import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('csharp-class-to-dart-class.start', () => {
		const activeTextEditor = vscode.window.activeTextEditor;
		let newText = "";
        if (activeTextEditor) {
			const regex = /(public|private)\s*(static\s*)?(class)\s*([a-zA-Z|\_]*)/gm;
			const regexFixProperty = /\{\{.*\}\}/gm;
            let document = activeTextEditor.document;
            const documentText = document.getText();
			let structList: any[] = [];

			let m;
			while ((m = regex.exec(documentText)) !== null) {
				if (m.index === regex.lastIndex) {
					regex.lastIndex++;
				}
				
				structList.push({
					indexInitClass: documentText.indexOf(m[0]),
					typeAndNameClass: m[0],
					privateClass: m[1] === "private" ? "_" : "",
					staticClass: m[2] || "",
					nameClass: m[4],
					strClass: "",
					dartClass: ""
				});
			}
			for (let index = 0; index < structList.length; index++) {
				structList[index].strClass = getStringClass(documentText, structList, index);
				structList[index].dartClass = generateDartClass(structList[index]);
			}
			for (let index = 0; index < structList.length; index++) {
				while ((m = regexFixProperty.exec(structList[index].dartClass)) !== null) {
					if (m.index === regex.lastIndex) {
						regex.lastIndex++;
					}
					let name = m[0].replace("{{", "").replace("}}", "");
					let indexClass: number = getIndexClassName(name, structList);
					structList[index].dartClass = structList[index].dartClass.replace(m[0], indexClass > -1 ? capitalizeUp(structList[indexClass].nameClass) : name);
				}
				newText += `${structList[index].dartClass}\n`;
			}
			if(newText.length > 0){
				activeTextEditor.edit((selectedText) => {
					var firstLine = activeTextEditor.document.lineAt(0);
					var lastLine = activeTextEditor.document.lineAt(activeTextEditor.document.lineCount - 1);
					var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
					selectedText.replace(textRange, newText);
				});
			}
        }
	});

	context.subscriptions.push(disposable);
}

function getIndexClassName(name: string, structList: any[]) : number {
	for (let index = 0; index < structList.length; index++) {
	  if(structList[index].nameClass === name){
		return index;
	  }
	}
	return -1;
  }
  
  function getStringClass(str: string, structList: any[], index: number) : string {
	return str.substring(structList[index].indexInitClass, index < structList.length -1 ? structList[index + 1].indexInitClass -1 : str.length);
  }
  
  function capitalizeUp(str: string) : string {
	return `${str.charAt(0).toUpperCase()}${str.substring(1)}`;
  }
  function capitalizeLower(str: string) : string {
	return `${str.charAt(0).toLowerCase()}${str.substring(1)}`;
  }
  
  function generateDartClass(structList: any) : string {
	let dartClass = "";
	dartClass += `${structList.staticClass.trim()} class ${structList.privateClass}${capitalizeUp(structList.nameClass)} {`.trim();
	dartClass += getProperty(structList.strClass);
	dartClass += "\n}";
	return dartClass;
  }
  
  function getProperty(strClass: string) : string {
	const regexProperty = /^(?!public\s+class)\s*public\s+(?:virtual\s+)?((?:[a-zA-Z_]+(?:(?:\<[a-zA-Z]+\??\>)|\[\]?)?\??))\s+([a-zA-Z_]+)\s*(?:\{\s*get|=>)/gm;
	let properties = "";
	let r;
	while ((r = regexProperty.exec(strClass)) !== null) {
	  if (r.index === regexProperty.lastIndex) {
		regexProperty.lastIndex++;
	  }
	  let type = convertNativeType(r[1]);
	  let name = r[2];
	  properties += `\n\t${type} ${capitalizeLower(name)};`;
	}
	return properties;
  }
  
  function convertNativeType(type: string) : string {
	let primitiveTypesCsharp = [
		'bool',
		'byte',
		'sbyte',
		'char',
		'decimal',
		'double',
		'float',
		'int',
		'uint',
		'nint',
		'nuint',
		'long',
		'ulong',
		'short',
		'ushort',
		'object',
		'string',
		'dynamic',
		"List"
	];
	let primitiveTypesDart = [
	  	'bool',
	  	'List<int>',
	  	'List<int>',
	  	'String',
	  	'double',
	  	'double',
	  	'double',
	  	'int',
	  	'int',
	  	'int',
	  	'int',
	  	'int',
	  	'int',
	  	'int',
	  	'int',
	  	'dynamic',
	  	'String',
	  	'dynamic',
		"List"
	];
	let nullable = type.indexOf('?') > -1 ? "?" : "";
	let _type: string = replaceStringListType(type);
	if(isListType(type)){
		_type = primitiveTypesCsharp.indexOf(_type) > -1 ? primitiveTypesDart[primitiveTypesCsharp.indexOf(_type)] : `{{${_type}}}`;
		return `List<${_type}${nullable}>`;
	}
	if(primitiveTypesCsharp.indexOf(_type) > -1){
		return primitiveTypesDart[primitiveTypesCsharp.indexOf(_type)] + nullable;
	}
	return `{{${type.replace(/\s+/gm, "")}}}`;
  }

  function replaceStringListType(type: string) : string {
	return type.replace(/\s+/gm, "")
		.replace("List", "")
		.replace("<", "")
		.replace(">", "")
		.replace("IEnumerable", "")
		.replace("?", "")
		.replace("[]", "");
  }

  function isListType(type: string){
	return type.indexOf("List") > -1 || type.indexOf("IEnumerable") > -1 || type.indexOf("[]") > -1;
  }
// this method is called when your extension is deactivated
export function deactivate() {}
