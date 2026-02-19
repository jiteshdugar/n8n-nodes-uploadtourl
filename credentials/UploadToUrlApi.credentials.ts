import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class UploadToUrlApi implements ICredentialType {
	name = 'uploadToUrlApi';

	displayName = 'Upload to URL API';

	icon: Icon = {
		light: 'file:../icons/uploadtourl.svg',
		dark: 'file:../icons/uploadtourl.dark.svg',
	};

	documentationUrl = 'https://uploadtourl.com';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://uploadtourl.com',
			url: '/api/api-key/verify',
			method: 'GET',
		},
	};
}
