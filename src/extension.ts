// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "hosts-helper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('hosts-helper.helloWorld', async () => {
		const path = vscode.workspace.getConfiguration('hostHelper').get('path', '');
		
		// Check file exists
		fs.access(path, fs.constants.F_OK, async err => {
			if (err) {
				vscode.window.showErrorMessage("Host file cannot be read, please check the path in configuration");
			}
			else {
				// Convert path to VS Code URI
				const hostUri = vscode.Uri.file(path);
				// Show the host file
				await vscode.window.showTextDocument(hostUri);
			}
		});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
