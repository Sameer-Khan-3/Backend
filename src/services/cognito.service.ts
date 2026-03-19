import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminEnableUserCommand,
  AdminDisableUserCommand,
  ListUsersCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

const getUserPoolId = () => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID is not configured");
  }
  return userPoolId;
};

const getClientId = () => {
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!clientId) {
    throw new Error("COGNITO_CLIENT_ID is not configured");
  }
  return clientId;
};

const readAttribute = (
  attributes: Array<{ Name?: string; Value?: string }> | undefined,
  name: string
) => {
  return attributes?.find((attribute) => attribute.Name === name)?.Value ?? null;
};

export type CognitoListedUser = {
  cognitoUsername: string;
  cognitoSub: string | null;
  email: string | null;
  username: string;
  role: string | null;
  status: string | null;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function registerCognitoUser(
  email: string,
  password: string,
  role: string,
  options?: {
    gender?: string;
    formattedName?: string;
  }
) {
  const clientId = getClientId();
  const userPoolId = getUserPoolId();

  const response = await client.send(
    new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: options?.formattedName || email },
        { Name: "gender", Value: options?.gender || "unspecified" },
      ],
    })
  );

  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: role,
    })
  );

  return {
    cognitoUsername: email,
    cognitoSub: response.UserSub ?? null,
    userConfirmed: response.UserConfirmed ?? false,
  };
}

export async function createCognitoUser(
  email: string,
  role: string,
  options?: {
    gender?: string;
    formattedName?: string;
    suppressMessage?: boolean;
  }
) {
  const userPoolId = getUserPoolId();

  // create user
  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "gender", Value: options?.gender || "unspecified" },
        { Name: "name", Value: options?.formattedName || email },
      ],
      DesiredDeliveryMediums: ["EMAIL"],
      ...(options?.suppressMessage ? { MessageAction: "SUPPRESS" } : {}),
    })
  );

  // add user to group
  await client.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: role,
    })
  );
}

export async function setCognitoUserPassword(email: string, password: string) {
  const userPoolId = getUserPoolId();
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );
}

export async function updateCognitoUserProfile(
  cognitoUsername: string,
  input: {
    email?: string;
    name?: string;
  }
) {
  const userPoolId = getUserPoolId();
  const userAttributes = [];

  if (typeof input.email === "string" && input.email.trim()) {
    userAttributes.push(
      { Name: "email", Value: input.email.trim() },
      { Name: "email_verified", Value: "true" }
    );
  }

  if (typeof input.name === "string" && input.name.trim()) {
    userAttributes.push({ Name: "name", Value: input.name.trim() });
  }

  if (userAttributes.length === 0) {
    return;
  }

  await client.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: cognitoUsername,
      UserAttributes: userAttributes,
    })
  );
}

export async function setCognitoUserEnabled(
  cognitoUsername: string,
  enabled: boolean
) {
  const userPoolId = getUserPoolId();

  if (enabled) {
    await client.send(
      new AdminEnableUserCommand({
        UserPoolId: userPoolId,
        Username: cognitoUsername,
      })
    );
    return;
  }

  await client.send(
    new AdminDisableUserCommand({
      UserPoolId: userPoolId,
      Username: cognitoUsername,
    })
  );
}

export async function getCognitoUser(email: string) {
  const userPoolId = getUserPoolId();
  return client.send(
    new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    })
  );
}

export async function getCognitoUserIdentity(email: string) {
  const user = await getCognitoUser(email);
  const attributes = user.UserAttributes ?? [];

  return {
    cognitoUsername: user.Username ?? email,
    cognitoSub: readAttribute(attributes, "sub"),
    email: readAttribute(attributes, "email") ?? email,
    status: user.UserStatus ?? null,
  };
}

export async function listCognitoUsers() {
  const userPoolId = getUserPoolId();
  const users: CognitoListedUser[] = [];
  let paginationToken: string | undefined;

  do {
    const response = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        PaginationToken: paginationToken,
      })
    );

    for (const user of response.Users ?? []) {
      const attributes = user.Attributes ?? [];
      const cognitoUsername = user.Username;

      if (!cognitoUsername) {
        continue;
      }

      const groupsResponse = await client.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Username: cognitoUsername,
        })
      );

      const groupNames = (groupsResponse.Groups ?? [])
        .map((group) => group.GroupName)
        .filter((name): name is string => Boolean(name));

      users.push({
        cognitoUsername,
        cognitoSub: readAttribute(attributes, "sub"),
        email: readAttribute(attributes, "email"),
        username:
          readAttribute(attributes, "name") ||
          readAttribute(attributes, "preferred_username") ||
          readAttribute(attributes, "email") ||
          cognitoUsername,
        role: groupNames[0] || null,
        status: user.UserStatus ?? null,
        enabled: user.Enabled ?? true,
        createdAt: user.UserCreateDate?.toISOString(),
        updatedAt: user.UserLastModifiedDate?.toISOString(),
      });
    }

    paginationToken = response.PaginationToken;
  } while (paginationToken);

  return users;
}

export async function setCognitoUserRole(cognitoUsername: string, role: string) {
  const userPoolId = getUserPoolId();
  const list = await client.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: cognitoUsername,
    })
  );

  const groups = list.Groups ?? [];
  const existingGroups = groups
    .map((group) => group.GroupName)
    .filter((name): name is string => Boolean(name));

  for (const groupName of existingGroups) {
    if (groupName !== role) {
      await client.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: cognitoUsername,
          GroupName: groupName,
        })
      );
    }
  }

  if (!existingGroups.includes(role)) {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: cognitoUsername,
        GroupName: role,
      })
    );
  }
}

export async function deleteCognitoUser(cognitoUsername: string) {
  const userPoolId = getUserPoolId();
  await client.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: cognitoUsername,
    })
  );
}
