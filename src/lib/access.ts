type AnyClient = { rpc: (fn: any) => any };

export async function callerIsStaff(client: AnyClient): Promise<boolean> {
  const { data, error } = await client.rpc("current_is_staff");
  if (error) throw new Error(error.message);
  return data === true;
}

export async function callerIsSuperAdmin(client: AnyClient): Promise<boolean> {
  const { data, error } = await client.rpc("current_is_super_admin");
  if (error) throw new Error(error.message);
  return data === true;
}
