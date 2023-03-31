import { HmacSHA1 } from 'crypto-js';
import encBase64 from 'crypto-js/enc-base64';

const getNonce = () => {
    return Math.floor((Math.random() * 9 + 1) * 1000000).toString();
};

type SimpleRequestInit = Omit<RequestInit, 'headers'> & { headers: Record<string, string> };

const filter = (value: string): string => {
    return value.replace(/[\t\n\r\f]/g, '');
};

function getCanonicalizedHeaders(headers: { [key: string]: string }): string {
    const prefix = 'x-acs-';
    const keys = Object.keys(headers);

    const canonicalizedKeys: Array<string> = [];
    for (const key of keys) {
        if (key.startsWith(prefix)) {
            canonicalizedKeys.push(key);
        }
    }

    canonicalizedKeys.sort();

    var result = '';
    for (const key of canonicalizedKeys) {
        result += `${key}:${filter(headers[key]!).trim()}\n`;
    }

    return result;
}

export const getCanonicalizedResource = (uriPattern: string, query: { [key: string]: string }): string => {
    const keys = !query ? [] : Object.keys(query).sort();

    if (keys.length === 0) {
        return uriPattern;
    }

    var result = [];
    for (const key of keys) {
        result.push(`${key}=${query[key]}`);
    }

    return `${uriPattern}?${result.join('&')}`;
};

const getStringToSign = (
    requestInit: SimpleRequestInit & { method: string },
    pathname: string,
    query: Record<string, string>
) => {
    const method = requestInit.method;
    const accept = requestInit.headers['accept'];
    const contentMD5 = requestInit.headers['content-md5'] ?? '';
    const contentType = requestInit.headers['content-type'] ?? '';
    const date = requestInit.headers['date'] ?? '';
    const header = `${method}\n${accept}\n${contentMD5}\n${contentType}\n${date}\n`;
    const canonicalizedHeaders = getCanonicalizedHeaders(requestInit.headers);
    const canonicalizedResource = getCanonicalizedResource(pathname, query);

    return [`${header}${canonicalizedHeaders}${canonicalizedResource}`, canonicalizedResource] as const;
};

const getROASignature = (stringToSign: string, secret: string): string => {
    return HmacSHA1(stringToSign, secret).toString(encBase64);
};

/**
 * 根据阿里云效 sdk 的签名方式 对 request 进行签名
 */
export const getSignedRequest = (id: string, key: string) => {
    return (
        pathname: string,
        method: string,
        request: Omit<RequestInit, 'headers'> & {
            headers: Record<string, string>;
            param: Record<string, string>;
        }
    ) => {
        const { version, action, ...others } = request.headers;

        const headers = {
            ...others,
            date: new Date().toUTCString(),
            accept: 'application/json',
            'x-acs-signature-nonce': getNonce(),
            'x-acs-signature-method': 'HMAC-SHA1',
            'x-acs-signature-version': '1.0',
            'x-acs-version': version ?? '',
            'x-acs-action': action ?? ''
        };

        const [stringToSign, pathnameAndQuery] = getStringToSign(
            { ...request, headers, method },
            pathname,
            request.param
        );

        const signature = getROASignature(stringToSign, key);

        const authorization = `acs ${id}:${signature}`;

        return [
            `https://${request.headers['host']}${pathnameAndQuery}`,
            {
                method,
                headers: {
                    ...headers,
                    authorization
                }
            }
        ] as [string, RequestInit];
    };
};
