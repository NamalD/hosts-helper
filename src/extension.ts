import * as vscode from 'vscode';
import * as fs from 'fs';
import * as ping from "ping";

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "hosts-helper" is now active!');

	const openHostsFile = vscode.commands.registerCommand('hosts-helper.openHostsFile', async () => {
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

	const deadHostsCollection = vscode.languages.createDiagnosticCollection('deadHosts');

	const validateMappings = vscode.commands.registerCommand('hosts-helper.validateMappings', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor === undefined || editor.document.languageId !== 'hosts') {
			vscode.window.showErrorMessage("Please open a host document");
			return;
		}

		let ipAddresses = [];
		for (let lineNo = 0; lineNo < editor.document.lineCount; lineNo++) {
			const line = editor.document.lineAt(lineNo);

			// Ignore empty lines
			if (line.isEmptyOrWhitespace) {
				continue;
			}

			// Ignore comments
			const firstMeaningfulChar = line.text[line.firstNonWhitespaceCharacterIndex];
			if (firstMeaningfulChar === '#') {
				continue;
			}

			// Get IP address
			const cleanLine = line.text.replace(/\s\s+/g, ' ');
			const ipAddress = cleanLine.split(' ')[0];

			// Calculate text position of IP address
			const startPosition = new vscode.Position(lineNo, line.firstNonWhitespaceCharacterIndex);
			const endChar = line.firstNonWhitespaceCharacterIndex + ipAddress.length;
			const endPosition = new vscode.Position(lineNo, endChar);
			const range = new vscode.Range(startPosition, endPosition);

			ipAddresses.push({
				ipAddress,
				range
			});
		}

		const addressProbes = ipAddresses.map(async address => {
			const response = await ping.promise.probe(address.ipAddress);
			return {
				alive: response.alive,
				address: address
			};
		});

		const addressStatuses = await Promise.all(addressProbes);
		const deadAddresses = addressStatuses.filter(a => !a.alive).map(a => a.address);
		const diagnostics = deadAddresses.map(address =>
			new vscode.Diagnostic(
				address.range,
				'Could not reach address',
				vscode.DiagnosticSeverity.Error
			));
		
		if (deadAddresses.length) {
			deadHostsCollection.set(editor.document.uri, diagnostics);
		}
		else {
			vscode.window.showInformationMessage('All host mappings are valid');
		}
	});

	// Clear diagnostics on text change
	vscode.workspace.onDidChangeTextDocument(e => {
		const diagnostics = deadHostsCollection.get(e.document.uri);
		if (diagnostics && diagnostics.length) {
			deadHostsCollection.delete(e.document.uri);
		}
	});

	context.subscriptions.push(openHostsFile, validateMappings);
}

// this method is called when your extension is deactivated
export function deactivate() {}
