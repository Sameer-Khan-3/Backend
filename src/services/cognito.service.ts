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
  region: process.env.COGNITO_REGION || process.env.AWS_REGION,
});

const getUserPoolId = () => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID is not configured");
  }
  return userPoolId;
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

export async function setCognitoUserRole(email: string, role: string) {
  const userPoolId = getUserPoolId();
  const list = await client.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: email,
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
          Username: email,
          GroupName: groupName,
        })
      );
    }
  }

  if (!existingGroups.includes(role)) {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: role,
      })
    );
  }
}

export async function deleteCognitoUser(email: string) {
  const userPoolId = getUserPoolId();
  await client.send(
    new AdminDeleteUserCommand({
      UserPoolId: userPoolId,
      Username: email,
    })
  );
}
