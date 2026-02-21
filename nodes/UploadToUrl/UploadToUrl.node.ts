import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class UploadToUrl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Upload to URL',
		name: 'uploadToUrl',
		icon: { light: 'file:upload-to-url.png', dark: 'file:upload-to-url.png' },
		group: ['output'],
		version: 1,
		subtitle: 'File Upload & Hosting',
		description: 'Upload files for instant hosting and receive a shareable public URL',
		defaults: {
			name: 'Upload to URL',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'uploadToUrlApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Upload File',
						value: 'upload',
						description: 'Upload a file (binary data or base64) and get a public URL',
						action: 'Upload a File',
					},
				],
				default: 'upload',
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Binary Data',
						value: 'binary',
						description: 'Use binary data from previous nodes',
					},
					{
						name: 'Base64 String',
						value: 'base64',
						description: 'Use base64 encoded string',
					},
				],
				default: 'binary',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						inputType: ['binary'],
					},
				},
				required: true,
				description: 'Name of the binary property containing the file to upload',
			},
			{
				displayName: 'Base64 Data',
				name: 'base64Data',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['base64'],
					},
				},
				required: true,
				description: 'Base64 encoded file data',
			},
			{
				displayName: 'Filename',
				name: 'fileName',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['base64'],
					},
				},
				required: true,
				description: 'Name of the file (e.g., document.pdf, image.jpg)',
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'string',
				displayOptions: {
					show: {
						inputType: ['base64'],
					},
				},
				required: true,
				description: 'MIME type of the file (e.g., application/pdf, image/jpeg)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const inputType = this.getNodeParameter('inputType', i) as string;
				let binaryDataBuffer: Buffer;
				let fileName: string;
				let contentType: string;

				if (inputType === 'binary') {
					// Handle binary data input
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					fileName = binaryData.fileName ?? 'file';
					contentType = binaryData.mimeType;
				} else {
					// Handle base64 input
					const base64Data = this.getNodeParameter('base64Data', i) as string;
					fileName = this.getNodeParameter('fileName', i) as string;
					contentType = this.getNodeParameter('mimeType', i) as string;

					// Clean base64 string (remove data URL prefix if present)
					const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
					
					// Convert base64 to buffer
					binaryDataBuffer = Buffer.from(cleanBase64, 'base64');
				}

				const boundary = '----n8nFormBoundary' + Math.random().toString(36).substring(2);
				const header = Buffer.from(
					`--${boundary}\r\n` +
						`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
						`Content-Type: ${contentType}\r\n\r\n`,
				);
				const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
				const body = Buffer.concat([header, binaryDataBuffer, footer]);

				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'uploadToUrlApi',
					{
						method: 'POST',
						url: 'https://uploadtourl.com/api/upload',
						body,
						headers: {
							'Content-Type': `multipart/form-data; boundary=${boundary}`,
						},
					},
				);

				returnData.push({
					json: typeof response === 'string' ? JSON.parse(response) : response,
					pairedItem: i,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: i,
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
