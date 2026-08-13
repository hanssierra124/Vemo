export interface CreatorTag {
  id: string;
  name: string;
}

export interface CreatorType {
  id: string;
  name: string;
  tags: CreatorTag[];
}
