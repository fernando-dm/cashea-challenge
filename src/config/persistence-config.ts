import { environment } from "./environment";
import type { PersistenceType } from "./persistence-type";

export function getPersistenceType(): PersistenceType {
    return environment.persistence;
}
