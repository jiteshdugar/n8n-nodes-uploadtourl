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
		icon: 'file:upload-to-url.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"].charAt(0).toUpperCase() + $parameter["operation"].slice(1) + " File"}}',
		description: 'Upload files for instant hosting and receive a shareable public URL. Delete anytime',
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
						action: 'Upload a file',
					},
					{
						name: 'Retrieve File',
						value: 'retrieve',
						description: 'Retrieve file information by file ID',
						action: 'Retrieve a file',
					},
					{
						name: 'Delete File',
						value: 'delete',
						description: 'Delete a file by file ID',
						action: 'Delete a file',
					},
				],
				default: 'upload',
			},
			// ---- File ID for Retrieve and Delete ----
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['retrieve', 'delete'],
					},
				},
				description: 'The ID of the file to retrieve or delete',
			},
			// ---- Upload-specific parameters ----
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
				displayOptions: {
					show: {
						operation: ['upload'],
					},
				},
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: ['upload'],
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
				default: '',
				displayOptions: {
					show: {
						operation: ['upload'],
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
				default: 'file.bin',
				displayOptions: {
					show: {
						operation: ['upload'],
						inputType: ['base64'],
					},
				},
				required: true,
				description: 'Name of the file (e.g., document.pdf, image.jpg)',
			},
			{
				displayName: 'MIME Type',
				name: 'mimeType',
				type: 'options',
				default: 'auto',
				displayOptions: {
					show: {
						operation: ['upload'],
						inputType: ['base64'],
					},
				},
				options: [
					{
						name: 'Auto-Detect From Filename',
						value: 'auto',
						description: 'Automatically detect MIME type from file extension',
					},
					{
						name: 'CSV File',
						value: 'text/csv',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Specify a custom MIME type',
					},
					{
						name: 'GIF Image',
						value: 'image/gif',
					},
					{
						name: 'JPEG Image',
						value: 'image/jpeg',
					},
					{
						name: 'JSON File',
						value: 'application/json',
					},
					{
						name: 'MP3 Audio',
						value: 'audio/mpeg',
					},
					{
						name: 'MP4 Video',
						value: 'video/mp4',
					},
					{
						name: 'PDF Document',
						value: 'application/pdf',
					},
					{
						name: 'PNG Image',
						value: 'image/png',
					},
					{
						name: 'SVG Image',
						value: 'image/svg+xml',
					},
					{
						name: 'Text File',
						value: 'text/plain',
					},
					{
						name: 'WebP Image',
						value: 'image/webp',
					},
					{
						name: 'XML File',
						value: 'application/xml',
					},
					{
						name: 'ZIP Archive',
						value: 'application/zip',
					},
				],
				required: true,
				description: 'MIME type of the file',
			},
			{
				displayName: 'Custom MIME Type',
				name: 'customMimeType',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['upload'],
						inputType: ['base64'],
						mimeType: ['custom'],
					},
				},
				required: true,
				description: 'Enter a custom MIME type (e.g., application/vnd.ms-excel)',
			},
			// ---- Expiry Options (for Upload) ----
			{
				displayName: 'Expiry',
				name: 'expiryType',
				type: 'options',
				default: '7',
				description: 'How long the file should be available on the server',
				displayOptions: {
					show: {
						operation: ['upload'],
					},
				},
				options: [
					{
						name: '1 Day',
						value: '1',
						description: 'File expires after 1 day',
					},
					{
						name: '7 Days',
						value: '7',
						description: 'File expires after 7 days',
					},
					{
						name: '15 Days',
						value: '15',
						description: 'File expires after 15 days',
					},
					{
						name: '30 Days',
						value: '30',
						description: 'File expires after 30 days',
					},
					{
						name: 'Never',
						value: 'never',
						description: 'File will never expire',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Set a custom number of days before the file expires',
					},
				],
			},
			{
				displayName: 'Expiry Days',
				name: 'expiryDays',
				type: 'number',
				default: 30,
				typeOptions: {
					minValue: 1,
				},
				description: 'Number of days the file should remain available',
				displayOptions: {
					show: {
						operation: ['upload'],
						expiryType: ['custom'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'retrieve') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'uploadToUrlApi',
						{
							method: 'GET',
							url: `https://uploadtourl.com/api/file/${fileId}`,
						},
					);
					returnData.push({
						json: typeof response === 'string' ? JSON.parse(response) : response,
						pairedItem: i,
					});
				} else if (operation === 'delete') {
					const fileId = this.getNodeParameter('fileId', i) as string;
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'uploadToUrlApi',
						{
							method: 'DELETE',
							url: `https://uploadtourl.com/api/file/${fileId}`,
						},
					);
					returnData.push({
						json: typeof response === 'string' ? JSON.parse(response) : response,
						pairedItem: i,
					});
				} else {
					// Upload operation
					const inputType = this.getNodeParameter('inputType', i) as string;
					let binaryDataBuffer: Buffer;
					let fileName: string;
					let contentType: string;

					if (inputType === 'binary') {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						fileName = binaryData.fileName ?? 'file';
						contentType = binaryData.mimeType;
					} else {
						const base64Data = this.getNodeParameter('base64Data', i) as string;
						fileName = this.getNodeParameter('fileName', i) as string;
						const mimeTypeValue = this.getNodeParameter('mimeType', i) as string;

						if (mimeTypeValue === 'auto') {
							const ext = fileName.split('.').pop()?.toLowerCase();
							const mimeMap: { [key: string]: string } = {
								'jpg': 'image/jpeg',
								'jpeg': 'image/jpeg',
								'png': 'image/png',
								'gif': 'image/gif',
								'webp': 'image/webp',
								'svg': 'image/svg+xml',
								'pdf': 'application/pdf',
								'txt': 'text/plain',
								'csv': 'text/csv',
								'json': 'application/json',
								'xml': 'application/xml',
								'zip': 'application/zip',
								'mp4': 'video/mp4',
								'mp3': 'audio/mpeg',
							};
							contentType = mimeMap[ext || ''] || 'application/octet-stream';
						} else if (mimeTypeValue === 'custom') {
							contentType = this.getNodeParameter('customMimeType', i) as string;
						} else {
							contentType = mimeTypeValue;
						}

						const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
						binaryDataBuffer = Buffer.from(cleanBase64, 'base64');
					}

					// Determine expiry_days value
					const expiryType = this.getNodeParameter('expiryType', i, '7') as string;
					let expiryDaysValue: string | number = 'never';
					if (expiryType === 'never') {
						expiryDaysValue = 'never';
					} else if (expiryType === 'custom') {
						expiryDaysValue = this.getNodeParameter('expiryDays', i, 30) as number;
					} else {
						// Preset values: '1', '7', '15', '30'
						expiryDaysValue = parseInt(expiryType, 10);
					}

					const boundary = '----n8nFormBoundary' + Math.random().toString(36).substring(2);

					// Build multipart body with file and expiry_days
					const filePart = Buffer.from(
						`--${boundary}\r\n` +
							`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
							`Content-Type: ${contentType}\r\n\r\n`,
					);
					const expiryPart = Buffer.from(
						`\r\n--${boundary}\r\n` +
							`Content-Disposition: form-data; name="expiry_days"\r\n\r\n` +
							`${expiryDaysValue}`,
					);
					const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
					const body = Buffer.concat([filePart, binaryDataBuffer, expiryPart, footer]);

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
				}
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
