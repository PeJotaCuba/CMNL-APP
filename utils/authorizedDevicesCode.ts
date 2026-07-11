export interface HardcodedUserDevice {
    username: string;
    deviceLimitEnabled: boolean;
    authorizedDevices: { token: string; name: string; type: string; os?: string; addedAt?: string }[];
}

// El administrador puede pegar aquí el contenido descargado del TXT para sellar el control en el código
export const HARDCODED_DEVICES: HardcodedUserDevice[] = [
    {
        "username": "admin",
        "deviceLimitEnabled": true,
        "authorizedDevices": [
            {
                "token": "DVC-VX23",
                "name": "Cell",
                "type": "Móvil",
                "addedAt": "22/5/2026"
            },
            {
                "token": "DVC-B25X",
                "name": "Laptop",
                "type": "PC",
                "addedAt": "22/5/2026"
            },
            {
                "token": "DVC-4A35",
                "name": "GIAS Lap",
                "type": "PC",
                "addedAt": "22/5/2026"
            },
            {
                "token": "DVC-KT4J",
                "name": "Admin-New",
                "type": "PC",
                "addedAt": "11/7/2026"
            }
        ]
    },
    {
        "username": "lissell",
        "deviceLimitEnabled": true,
        "authorizedDevices": [
            {
                "token": "DVC-4Z9H5",
                "name": "Móvil",
                "type": "Móvil",
                "addedAt": "9/7/2026"
            },
            {
                "token": "DVC-6N7P",
                "name": "PC-Informativo",
                "type": "PC",
                "addedAt": "9/7/2026"
            }
        ]
    },
    {
        "username": "pedro",
        "deviceLimitEnabled": true,
        "authorizedDevices": [
            {
                "token": "DVC-VX23",
                "name": "Cell",
                "type": "Móvil",
                "addedAt": "22/5/2026"
            },
            {
                "token": "DVC-J8BB",
                "name": "Laptop",
                "type": "PC",
                "addedAt": "25/5/2026"
            },
            {
                "token": "DVC-U7K4",
                "name": "GAISLap",
                "type": "PC",
                "addedAt": "7/6/2026"
            },
            {
                "token": "DVC-ETN9",
                "name": "Laptop",
                "type": "PC",
                "addedAt": "7/6/2026"
            }
        ]
    },
    {
        "username": "admincmnl",
        "deviceLimitEnabled": true,
        "authorizedDevices": [
            {
                "token": "DVC-VX23",
                "name": "Cell",
                "type": "Móvil",
                "addedAt": "22/5/2026"
            },
            {
                "token": "DVC-4A35",
                "name": "GIAS Lap",
                "type": "PC",
                "addedAt": "22/5/2026"
            },
            {
                "token": "DVC-J8BB",
                "name": "Laptop",
                "type": "PC",
                "addedAt": "25/5/2026"
            },
            {
                "token": "DVC-U7K4",
                "name": "GAISLap",
                "type": "PC",
                "addedAt": "7/6/2026"
            },
            {
                "token": "DVC-ETN9",
                "name": "Laptop",
                "type": "PC",
                "addedAt": "7/6/2026"
            },
            {
                "token": "DVC-KT4J",
                "name": "Admin-New",
                "type": "PC",
                "addedAt": "11/7/2026"
            }
        ]
    }
];

/**
 * Determina si un usuario tiene habilitado el control de dispositivos, priorizando el código sellado.
 */
export function isDeviceLimitEnabledForUser(username: string, dbUserValue?: boolean): boolean {
    const hardcoded = HARDCODED_DEVICES.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (hardcoded) {
        return hardcoded.deviceLimitEnabled;
    }
    return dbUserValue || false;
}

/**
 * Retorna la lista de dispositivos autorizados para un usuario, priorizando el código sellado.
 */
export function getAuthorizedDevicesForUser(username: string, dbDevicesValue?: any[]): any[] {
    const hardcoded = HARDCODED_DEVICES.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (hardcoded) {
        return hardcoded.authorizedDevices;
    }
    return dbDevicesValue || [];
}
