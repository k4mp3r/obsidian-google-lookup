import { google, people_v1 } from 'googleapis';
import { getAuthClient } from './auth';
import { PersonResult } from '@/types';

interface ServiceOptions {
	credentialsFile: string;
	tokenFile: string;
}

interface QueryOptions {
	service: people_v1.People;
	accountName: string;
}

export const getPeopleService = async ({ credentialsFile, tokenFile }: ServiceOptions) => {
	const auth = await getAuthClient(credentialsFile, tokenFile);

	if (!auth) {
		throw 'unable to get auth client';
	}

	return google.people({
		version: 'v1',
		auth
	});
};

export const searchContactsAndDirectory = async (
	query: string,
	options: QueryOptions
): Promise<PersonResult[] | undefined> => {
	const directory = await searchDirectory(query, options);
	const contacts = await searchContacts(query, options);

	return directory && contacts ? directory.concat(contacts) : directory ? directory : contacts ? contacts : undefined;
};

export const searchDirectory = async (
	query: string,
	{ service, accountName }: QueryOptions
): Promise<PersonResult[] | undefined> => {
	//const service = await getPeopleService(options);

	const response = await service.people.searchDirectoryPeople({
		query,
		readMask: 'names,nicknames,emailAddresses,phoneNumbers,biographies,calendarUrls,organizations',
		sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT', 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE']
	});

	if (response.status !== 200) {
		console.warn(`error querying people api ${response.statusText}`);
		return;
	}
	console.log(JSON.stringify(response.data, null, 2));

	if (!response.data?.people || response.data?.people?.length === 0) {
		return;
	}

	return response.data.people.map((p): PersonResult => {
		const { names, organizations, emailAddresses, phoneNumbers } = p;
		return {
			accountSource: accountName,
			displayNameLastFirst: names && names[0].displayNameLastFirst ? names[0].displayNameLastFirst : 'unknown',
			firstName: names && names[0].givenName ? names[0].givenName : 'unknown',
			lastName: names && names[0].familyName ? names[0].familyName : 'unknown',
			org:
				organizations && organizations[0]
					? {
							department: organizations[0].department,
							title: organizations[0].title
					  }
					: undefined,
			type: 'DIRECTORY',
			emails: emailAddresses ? emailAddresses.map((e) => e.value) : [],
			phones: phoneNumbers ? phoneNumbers.map((e) => e.value) : []
		};
	});
};

export const searchContacts = async (
	query: string,
	{ service, accountName }: QueryOptions
): Promise<PersonResult[] | undefined> => {
	// const service = await getPeopleService(options);

	const response = await service.people.searchContacts({
		query,
		readMask: 'names,nicknames,emailAddresses,phoneNumbers,biographies,calendarUrls,organizations',
		sources: ['READ_SOURCE_TYPE_CONTACT', 'READ_SOURCE_TYPE_PROFILE', 'READ_SOURCE_TYPE_DOMAIN_CONTACT']
	});

	if (response.status !== 200) {
		console.warn(`error querying people api ${response.statusText}`);
		return;
	}
	console.log(JSON.stringify(response.data, null, 2));

	if (!response.data?.results || response.data?.results?.length === 0) {
		return;
	}

	return response.data.results.map((p): PersonResult => {
		const { names, organizations, emailAddresses, phoneNumbers } = p.person!;
		return {
			accountSource: accountName,
			displayNameLastFirst: names && names[0].displayNameLastFirst ? names[0].displayNameLastFirst : 'unknown',
			firstName: names && names[0].givenName ? names[0].givenName : 'unknown',
			lastName: names && names[0].familyName ? names[0].familyName : 'unknown',
			org:
				organizations && organizations[0]
					? {
							department: organizations[0].department,
							title: organizations[0].title
					  }
					: undefined,
			type: 'CONTACTS',
			emails: emailAddresses ? emailAddresses.map((e) => e.value) : [],
			phones: phoneNumbers ? phoneNumbers.map((e) => e.value) : []
		};
	});
};