// Client projection is deliberately independent of private logistics and costs.
export function projectReceptionPublication(publication,operation,scope){
 if(!publication||publication.active!==true||publication.tenantId!==scope.tenantId||publication.campaignId!==scope.campaignId||operation?.incident?.open===true||publication.sourceRevision!==operation?.revision)return null;
 return {date:publication.date,venue:publication.venue,guests:publication.guests,status:publication.status,publishedAt:publication.publishedAt};
}
