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
		icon: { light: 'file:uploadtourl.svg', dark: 'file:uploadtourl.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: 'File Upload & Hosting — get a public URL instantly',
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
						description: 'Upload a file and get a public URL',
						action: 'Upload a file',
					},
				],
				default: 'upload',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the file to upload',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

				const boundary = '----n8nFormBoundary' + Math.random().toString(36).substring(2);
				const fileName = binaryData.fileName ?? 'file';
				const contentType = binaryData.mimeType;

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
