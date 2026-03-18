import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminSetUserPasswordCommand,
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

const readAttribute = (
  attributes: Array<{ Name?: string; Value?: string }> | undefined,
  name: string
) => {
  return attributes?.find((attribute) => attribute.Name === name)?.Value ?? null;
};

export async function createCognitoUser(
  email: string,
  role: string,
  options?: {
    gender?: string;
    formattedName?: string;
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
      MessageAction: "SUPPRESS",
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
