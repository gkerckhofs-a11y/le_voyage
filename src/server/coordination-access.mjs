// Server-only projection of a dedicated campaign coordination capability.
export function coordinatedMembership(member,scope){
 if(member?.canCoordinateWeeks!==true||!Array.isArray(member.coordinatedAssignments)||!member.coordinatedAssignments.some(a=>a.campaignId===scope.campaignId&&a.teamId===scope.teamId))throw Object.assign(new Error('Coordination denied'),{status:403});
 return {...member,assignments:member.coordinatedAssignments};
}
